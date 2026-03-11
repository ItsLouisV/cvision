import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  ScrollView, RefreshControl, Share, Platform, Dimensions
} from 'react-native';
import { 
  RefreshCw, Heart, Ellipsis, MessageCircle, Send, Search, TextAlignStart,
  BellDot, MapPin, CircleDollarSign, Verified
} from 'lucide-react-native';

import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import FeedSkeleton from './skeleton/FeedSkeleton';

const { width } = Dimensions.get('window');

interface FeedViewProps {
  onPressMenu?: () => void;
  onPressSearch?: () => void;
}

const JOB_TYPE_MAP = {
  "full-time": "Toàn thời gian",
  "part-time": "Bán thời gian",
  "contract": "Hợp đồng",
  "internship": "Thực tập",
  "freelance": "Freelance",
  "remote": "Remote",
};

const FeedView = ({ onPressMenu, onPressSearch }: FeedViewProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<{[key: string]: boolean}>({});
  const [hasUnread, setHasUnread] = useState(false);

  // 1. FETCH DỮ LIỆU THỰC TỪ SUPABASE
  const checkUnreadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
        
      if (error) throw error;
      setHasUnread((count || 0) > 0);
    } catch (e) {
      console.log('Error checking notifications', e);
    }
  };
  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          employers (
            company_name,
            company_logo,
            is_verified
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedPosts = data.map(job => ({
          id: job.id,
          company: job.company_name || job.employers?.company_name || 'Công ty ẩn danh',
          avatar: job.employers?.company_logo || `https://ui-avatars.com/api/?name=${job.company_name || 'HR'}&background=8e44ad&color=fff`,
          title: job.title,
          content: job.description,
          require: job.required_experience,
          time: formatTime(job.created_at),
          salary: formatSalary(job.salary_from, job.salary_to),
          location: job.location || 'Toàn quốc',
          tech_stack: [job.job_type, job.category].filter(Boolean),
          is_verified: job.employers?.is_verified || false,
          likes: Math.floor(Math.random() * 50) + 10, // Mock số liệu vì chưa có bảng tương tác
          replies: Math.floor(Math.random() * 15),
        }));
        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Fetch jobs error:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi kết nối',
        text2: 'Không thể tải danh sách công việc.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // 2. HELPER FUNCTIONS
  const formatSalary = (from: number | null, to: number | null) => {
    if (!from && !to) return 'Thỏa thuận';
    const f = from ? (from / 1000000).toFixed(0) : '?';
    const t = to ? (to / 1000000).toFixed(0) : '?';
    return `${f} - ${t} triệu`;
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMin = Math.floor((now.getTime() - past.getTime()) / 60000);
    
    if (diffInMin < 1) return 'vừa xong';
    if (diffInMin < 60) return `${diffInMin}p`;
    const diffInHours = Math.floor(diffInMin / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)} ngày`;
  };

  // Lấy data lần đầu
  useEffect(() => {
    fetchJobs();
    checkUnreadNotifications();

    // Lắng nghe sự kiện realtime table notification (có thay đổi -> check lại)
    const channel = supabase
      .channel('feed-bell-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => checkUnreadNotifications() // Cập nhật lại chuông
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
    checkUnreadNotifications();
  };

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const onShare = async (company: string, title: string) => {
    try {
      await Share.share({
        message: `[Louis AI] Cơ hội việc làm hấp dẫn: ${title} tại ${company}. Xem ngay trên App!`,
      });
    } catch (error) { console.error(error); }
  };

  const onPressNotification = () => {
    router.push('../notifications');
  };

  // 3. UI RENDER
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}>
        <TouchableOpacity onPress={onPressMenu} activeOpacity={0.7} style={styles.headerBtn}>
          <TextAlignStart size={24} color={theme.text} />
        </TouchableOpacity> 

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onPressNotification} activeOpacity={0.7} style={[styles.headerBtn, { marginLeft: 12 }]}>
            <BellDot size={25} color={hasUnread ? '#e74c3c' : theme.text} />
            {hasUnread && <View style={styles.badge} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={onPressSearch} activeOpacity={0.7} style={[styles.headerBtn, { marginLeft: 12 }]}>
            <Search size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />
        }
      >
        {isLoading ? (
          <FeedSkeleton />
        ) : (
          posts.map((post) => (
            <TouchableOpacity 
              key={post.id} 
              activeOpacity={0.9} 
              style={styles.postWrapper}
              onPress={() => router.push(`/jobs/${post.id}`)}
            >
              {/* CỘT TRÁI - AVATAR & LINE */}
              <View style={styles.leftColumn}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: post.avatar }} style={styles.avatar} />
                  {post.is_verified && (
                    <View style={styles.verifiedIcon}>
                      <Verified size={14} color="#8e44ad" fill="#FFF" />
                    </View>
                  )}
                </View>
                <View style={[styles.verticalLine, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]} />
              </View>

              {/* CỘT PHẢI - NỘI DUNG */}
              <View style={[styles.rightColumn, { borderBottomColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}>
                <View style={styles.userRow}>
                  <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{post.company}</Text>
                  <View style={styles.userRowRight}>
                    <Text style={[styles.timeText, { color: isDark ? '#888' : '#999' }]}>{post.time}</Text>
                    <Ellipsis size={18} color={isDark ? '#888' : '#999'} style={{ marginLeft: 10 }} />
                  </View>
                </View>

                <Text style={[styles.jobTitle, { color: theme.text }]}>{post.title}</Text>
                <Text style={[styles.postContent, { color: theme.text }]} numberOfLines={3}>
                  {post.content}
                </Text>
                
                {/* THÔNG TIN JOB */}
                <View style={styles.jobMetaRow}>
                  <View style={styles.metaItem}>
                    <CircleDollarSign size={14} color="#8e44ad" />
                    <Text style={[styles.metaText, { color: theme.text }]}>{post.salary}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={14} color="#8e44ad" />
                    <Text style={[styles.metaText, { color: theme.text }]}>{post.location}</Text>
                  </View>
                </View>

                {/* TAGS */}
                <View style={styles.techStackRow}>
                  {post.tech_stack.map((tech: string, index: number) => (
                    <View key={index} style={[styles.techTag, { backgroundColor: isDark ? '#1C1C1E' : '#F3E8FF' }]}>
                      <Text style={styles.techTagText}>{tech}</Text>
                    </View>
                  ))}
                </View>

                {/* ACTIONS */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                    <Heart 
                      size={20} 
                      color={likedPosts[post.id] ? "#e74c3c" : theme.text} 
                      fill={likedPosts[post.id] ? "#e74c3c" : "transparent"} 
                    />
                    <Text style={[styles.actionCount, { color: isDark ? '#888' : '#999' }]}>
                      {likedPosts[post.id] ? post.likes + 1 : post.likes}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn}>
                    <MessageCircle size={20} color={theme.text} />
                    <Text style={[styles.actionCount, { color: isDark ? '#888' : '#999' }]}>{post.replies}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn}>
                    <RefreshCw size={19} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(post.company, post.title)}>
                    <Send size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 54,
    borderBottomWidth: 0.5
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    borderWidth: 1.5,
    borderColor: '#FFF'
  },
  postWrapper: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 15 },
  leftColumn: { alignItems: 'center', width: 45 },
  avatarContainer: { width: 44, height: 44, position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eee' },
  verifiedIcon: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#FFF', borderRadius: 10 },
  verticalLine: { width: 2, flex: 1, marginTop: 8, borderRadius: 1, marginBottom: 4 },
  rightColumn: { flex: 1, marginLeft: 12, paddingBottom: 20, borderBottomWidth: 0.5 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontWeight: '800', fontSize: 15, maxWidth: '70%' },
  userRowRight: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 13, fontWeight: '400' },
  jobTitle: { fontSize: 16, fontWeight: '700', marginTop: 6, color: '#8e44ad' },
  postContent: { fontSize: 14, marginTop: 4, lineHeight: 20, opacity: 0.85 },
  jobMetaRow: { gap: 10, marginTop: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  techStackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  techTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  techTagText: { fontSize: 11, fontWeight: '800', color: '#8e44ad', textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', marginTop: 18, marginLeft: -4, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24, padding: 2 },
  actionCount: { fontSize: 13, marginLeft: 6, fontWeight: '500' },
});

export default FeedView;