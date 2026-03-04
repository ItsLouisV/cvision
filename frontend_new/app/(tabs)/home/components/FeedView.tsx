import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  ScrollView, RefreshControl, Share, Platform 
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
import FeedSkeleton from './skeleton/FeedSkeleton';

interface FeedViewProps {
  onPressMenu?: () => void;
  onPressSearch?: () => void;
}

const FeedView = ({ onPressMenu, onPressSearch }: FeedViewProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true); 
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<{[key: string]: boolean}>({});

  // 1. Giả lập fetch dữ liệu Tin tuyển dụng
  const fetchData = async () => {
    // Trong thực tế Louis sẽ dùng: await supabase.from('jobs').select('*, employers(*)')
    await new Promise(resolve => setTimeout(resolve, 1200));
    const newData = [
      { 
        id: '1', 
        company: 'Vingroup AI Center', 
        avatar: 'https://ui-avatars.com/api/?name=Vingroup&background=8e44ad&color=fff', 
        content: 'Chúng tôi đang tìm kiếm AI Engineer thực tập sinh. Cơ hội làm việc trực tiếp với các mô hình Gemini và xử lý dữ liệu Big Data tại Việt Nam.', 
        time: 'vừa xong',
        salary: '12 - 18 triệu',
        location: 'Hà Nội',
        tech_stack: ['Python', 'Gemini API', 'PyTorch'],
        is_verified: true,
        likes: 124,
        replies: 45
      },
      { 
        id: '2', 
        company: 'FPT Software', 
        avatar: 'https://ui-avatars.com/api/?name=FPT&background=f39c12&color=fff', 
        content: 'Tuyển dụng Senior React Native. Môi trường làm việc Hybrid, ưu tiên ứng viên có kinh nghiệm xử lý Performance và hoạt họa mượt mà.', 
        image: 'https://picsum.photos/seed/work/400/250', 
        time: '3 giờ',
        salary: '25 - 45 triệu',
        location: 'Đà Nẵng',
        tech_stack: ['React Native', 'TypeScript', 'Redux'],
        is_verified: true,
        likes: 850,
        replies: 120
      },
    ];
    setPosts(newData);
  };

  useEffect(() => {
    fetchData().then(() => setIsLoading(false));
  }, []);

  // 2. Logic tương tác
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const onShare = async (company: string, content: string) => {
    try {
      await Share.share({
        message: `[Louis AI Job] Tin tuyển dụng từ ${company}: ${content}`,
      });
    } catch (error) { console.error(error); }
  };

  const onPressNotification = () => {
    Toast.show({
      type: 'success',
      text1: 'Thông báo',
      text2: 'Bạn có 3 tin tuyển dụng mới phù hợp với hồ sơ AI',
      visibilityTime: 1500,
    });
  };

  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    text: { color: theme.text },
    subText: { color: isDark ? '#888' : '#999' },
    line: { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      {/* HEADER GIỮ NGUYÊN BỐ CỤC CỦA LOUIS */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onPressMenu} activeOpacity={0.7} style={styles.headerBtn}>
          <TextAlignStart size={24} color={theme.text} style={{ opacity: 0.9 }} />
        </TouchableOpacity> 

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onPressNotification} activeOpacity={0.7} style={[styles.headerBtn, { marginLeft: 12 }]}>
            <BellDot size={24} color={theme.text} style={{ opacity: 0.9 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onPressSearch} activeOpacity={0.7} style={[styles.headerBtn, { marginLeft: 12 }]}>
            <Search size={24} color={theme.text} style={{ opacity: 0.9 }} />
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
            <View key={post.id} style={styles.postWrapper}>
              {/* CỘT TRÁI - AVATAR & LINE (THREADS STYLE) */}
              <View style={styles.leftColumn}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: post.avatar }} style={styles.avatar} />
                  {post.is_verified && (
                    <View style={styles.verifiedIcon}>
                      <Verified size={14} color="#8e44ad" fill="#FFF" />
                    </View>
                  )}
                </View>
                <View style={[styles.verticalLine, dynamicStyles.line]} />
              </View>

              {/* CỘT PHẢI - NỘI DUNG TUYỂN DỤNG */}
              <View style={[styles.rightColumn, { borderBottomColor: dynamicStyles.line.backgroundColor }]}>
                <View style={styles.userRow}>
                  <Text style={[styles.userName, dynamicStyles.text]}>{post.company}</Text>
                  <View style={styles.userRowRight}>
                    <Text style={[styles.timeText, dynamicStyles.subText]}>{post.time}</Text>
                    <Ellipsis size={18} color={dynamicStyles.subText.color} style={{ marginLeft: 10 }} />
                  </View>
                </View>

                <Text style={[styles.postContent, dynamicStyles.text]}>{post.content}</Text>
                
                {/* THÔNG TIN JOB (LƯƠNG & ĐỊA ĐIỂM) */}
                <View style={styles.jobMetaRow}>
                  <View style={styles.metaItem}>
                    <CircleDollarSign size={14} color="#8e44ad" />
                    <Text style={[styles.metaText, dynamicStyles.text]}>{post.salary}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={14} color="#8e44ad" />
                    <Text style={[styles.metaText, dynamicStyles.text]}>{post.location}</Text>
                  </View>
                </View>

                {/* TECH STACK TAGS */}
                <View style={styles.techStackRow}>
                  {post.tech_stack.map((tech: string, index: number) => (
                    <View key={index} style={[styles.techTag, { backgroundColor: isDark ? '#1C1C1E' : '#F3E8FF' }]}>
                      <Text style={styles.techTagText}>{tech}</Text>
                    </View>
                  ))}
                </View>

                {post.image && <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />}

                {/* ACTION BAR (TIM, COMMENT, REPOST, SHARE) */}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                    <Heart 
                      size={21} 
                      color={likedPosts[post.id] ? "#e74c3c" : theme.text} 
                      fill={likedPosts[post.id] ? "#e74c3c" : "transparent"} 
                    />
                    <Text style={[styles.actionCount, dynamicStyles.subText]}>
                      {likedPosts[post.id] ? post.likes + 1 : post.likes}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn}>
                    <MessageCircle size={21} color={theme.text} />
                    <Text style={[styles.actionCount, dynamicStyles.subText]}>{post.replies}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn}>
                    <RefreshCw size={21} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(post.company, post.content)}>
                    <Send size={21} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 4 },
  postWrapper: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 15 },
  leftColumn: { alignItems: 'center', width: 45 },
  avatarContainer: { width: 45, height: 45, position: 'relative' },
  avatar: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#eee' },
  verifiedIcon: { position: 'absolute', bottom: -4, right: -4 },
  verticalLine: { width: 2, flex: 1, marginTop: 8, borderRadius: 1, marginBottom: 4 },
  rightColumn: { flex: 1, marginLeft: 12, paddingBottom: 20, borderBottomWidth: 0.5 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontWeight: '800', fontSize: 15 },
  userRowRight: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 13 },
  postContent: { fontSize: 15, marginTop: 4, lineHeight: 22 },
  jobMetaRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
  techStackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  techTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  techTagText: { fontSize: 11, fontWeight: '800', color: '#8e44ad' },
  postImage: { width: '100%', height: 220, borderRadius: 15, marginTop: 15, backgroundColor: '#111' },
  actionRow: { flexDirection: 'row', marginTop: 18, marginLeft: -5, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 22, padding: 2 },
  actionCount: { fontSize: 13, marginLeft: 6, fontWeight: '500' },
});

export default FeedView;