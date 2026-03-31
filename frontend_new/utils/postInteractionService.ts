import { supabase } from '@/lib/supabase';

export const PostService = {
  /**
   * 1. THẢ TIM (LOVE POST)
   * Tự động kiểm tra: Nếu đã tim thì bỏ tim, nếu chưa thì thêm tim.
   */
    async toggleLike(postId: string) {
        try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vui lòng đăng nhập");

        // Kiểm tra xem đã tim chưa
        const { data: existing } = await supabase
            .from('loved_posts')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', postId)
            .single();

        if (existing) {
            // Nếu có rồi thì xóa (Unlove)
            const { error } = await supabase
            .from('loved_posts')
            .delete()
            .eq('id', existing.id);
            if (error) throw error;
            return { action: 'unloved' };
        } else {
            // Nếu chưa có thì thêm (Love)
            const { error } = await supabase
            .from('loved_posts')
            .insert({ user_id: user.id, post_id: postId });
            if (error) throw error;
            return { action: 'loved' };
        }
        } catch (error: any) {
        console.error("Error toggleLike:", error.message);
        return { error: error.message };
        }
    },

  /**
   * 2. LƯU BÀI VIẾT (SAVE POST)
   */
    async toggleSave(postId: string, folder?: string) {
        try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vui lòng đăng nhập");

        const { data: existing } = await supabase
            .from('saved_posts')
            .select('id')
            .eq('user_id', user.id)
            .eq('post_id', postId)
            .single();

        if (existing) {
            const { error } = await supabase.from('saved_posts').delete().eq('id', existing.id);
            if (error) throw error;
            return { action: 'unsaved' };
        } else {
            const { error } = await supabase
            .from('saved_posts')
            .insert({ user_id: user.id, post_id: postId, folder: folder || null });
            if (error) throw error;
            return { action: 'saved' };
        }
        } catch (error: any) {
        return { error: error.message };
        }
    },

  /**
   * 3. LẤY DANH SÁCH BÌNH LUẬN (KÈM INFO USER)
   */
    async getComments(postId: string) {
        try {
        const { data, error } = await supabase
            .from('comments')
            .select(`
            *,
            user_profiles (
                full_name,
                avatar_url
            )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { data };
        } catch (error: any) {
        return { error: error.message };
        }
    },

  /**
   * 4. GỬI BÌNH LUẬN MỚI
   */
    async addComment(postId: string, content: string, parentId?: string) {
        try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vui lòng đăng nhập");

        const { data, error } = await supabase
            .from('comments')
            .insert({
            user_id: user.id,
            post_id: postId,
            content: content,
            parent_id: parentId || null
            })
            .select(`
            *,
            user_profiles (full_name, avatar_url)
            `)
            .single();

        if (error) throw error;
        return { data };
        } catch (error: any) {
        return { error: error.message };
        }
    }
};