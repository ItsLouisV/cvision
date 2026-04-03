import { supabase } from '@/lib/supabase';

export const FollowService = {
  /**
   * THEO DÕI HOẶC BỎ THEO DÕI NGƯỜI DÙNG
   */
  async toggleFollow(followingId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vui lòng đăng nhập");

      if (user.id === followingId) throw new Error("Không thể tự theo dõi chính mình");

      // Kiểm tra xem đã theo dõi chưa
      const { data: existing } = await supabase
        .from('followers')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .single();

      if (existing) {
        // Nếu đã theo dõi rồi thì bỏ theo dõi
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', followingId);
        
        if (error) throw error;
        return { action: 'unfollowed' };
      } else {
        // Nếu chưa theo dõi thì thêm mới
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: followingId });
        
        if (error) throw error;
        return { action: 'followed' };
      }
    } catch (error: any) {
      console.error("Error toggleFollow:", error.message);
      return { error: error.message };
    }
  }
};
