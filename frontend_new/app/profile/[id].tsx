import React from "react";
import { 
  View, Text, StyleSheet, Image, ActivityIndicator, 
  Dimensions, StatusBar, TouchableOpacity, 
  Animated, 
  Platform
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/themes";
import { 
  ArrowLeft, MessageSquare, MapPin, 
  CheckCircle, Share2, MoreHorizontal, 
  Edit3, Calendar, Briefcase
} from "lucide-react-native";
import { PostCard } from "@/components/PostCard";
import { FollowService } from "@/utils/followService"; 
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatSalary, formatTime } from "@/utils/formatters";

const { width } = Dimensions.get("window");
const BANNER_HEIGHT = 250;

const ProfileScreen = () => {
  const { id } = useLocalSearchParams();
  const userId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme ?? "light"];
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();

  // 1. Current Auth User
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });
  const currentUserId = currentUser?.id;

  // 2. Profile Data & Employer Info
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*, employers(*)")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  const isOwner = currentUserId === userId;
  const isEmployer = profile?.role === 'employer';
  const employerId = profile ? (Array.isArray(profile.employers) ? profile.employers[0]?.id : profile.employers?.id) : undefined;

  // 3. Stats & Follow Status
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['profileStats', userId, currentUserId],
    queryFn: async () => {
      const [fCount, fgCount, fStatus] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        currentUserId ? supabase.from('followers').select('follower_id').eq('follower_id', currentUserId).eq('following_id', userId).maybeSingle() : Promise.resolve({ data: null })
      ]);
      return {
        followers: fCount.count || 0,
        following: fgCount.count || 0,
        isFollowing: !!fStatus.data
      };
    },
    enabled: !!userId
  });

  const stats = statsData || { followers: 0, following: 0, isFollowing: false };
  const isFollowing = stats.isFollowing;

  // 4. Job Posts
  const { data: posts = [], isLoading: isPostsLoading } = useQuery({
    queryKey: ['profilePosts', userId, employerId, profile?.role],
    queryFn: async () => {
      // 🎯 Chú ý: Cú pháp .filter(user_id, eq, ...) là cách duy nhất để lồng filter vào select
      // mà không làm gãy trình phân tích cú pháp của TypeScript Supabase.
      let postQuery = supabase
        .from("job_posts")
        .select(`
          *,
          employers (company_name, is_verified),
          user_profiles (full_name, avatar_url, username),
          total_likes:loved_posts(count),
          total_comments:comments(count),
          my_like:loved_posts(id).filter(user_id, eq, ${currentUserId})
        `);

      // Logic phân loại: Nếu là Employer thì lọc theo công ty, ngược lại lọc theo cá nhân
      if (profile?.role === 'employer' && employerId) {
        postQuery = postQuery.eq('employer_id', employerId);
      } else {
        postQuery = postQuery.eq('user_id', userId);
      }

      const { data: jobPosts, error } = await postQuery.order("created_at", { ascending: false });
      
      if (error) throw error;

      // 🎯 Dùng (jobPosts as any[]) để fix lỗi "Property does not exist on type ParserError"
      return (jobPosts as any[]).map(job => ({
        ...job,
        userId: job.user_profiles?.id || job.user_id,
        userName: job.user_profiles?.full_name || job.company_name || "Người dùng",
        userAvatar: job.user_profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.user_profiles?.full_name || job.company_name || "U")}&background=8e44ad&color=fff`,
        companyName: job.employers?.company_name || job.company_name || null,
        title: job.title,
        content: job.description,
        require: job.required_experience,
        time: formatTime(job.created_at),
        salary: formatSalary(job.salary_from, job.salary_to, job.currency, job.salary_unit),
        location: job.location || "Toàn quốc",
        type: job.job_type,
        category: job.category,
        is_verified: job.employers?.is_verified || false,
        likes: job.total_likes?.[0]?.count || 0,
        replies: job.total_comments?.[0]?.count || 0,
        isLiked: job.my_like && job.my_like.length > 0,
      }));
    },
    // Chỉ chạy khi đã có profile để xác định Role/EmployerId
    enabled: !!userId && profile !== undefined 
  });

  const isLoading = isProfileLoading || isStatsLoading;

  // 5. Follow Mutation
  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      const { error } = await FollowService.toggleFollow(userId as string);
      if (error) throw new Error(error.message || 'Lỗi hệ thống');
      return true;
    },
    onMutate: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.cancelQueries({ queryKey: ['profileStats', userId, currentUserId] });
      const previousStats = queryClient.getQueryData(['profileStats', userId, currentUserId]);
      
      queryClient.setQueryData(['profileStats', userId, currentUserId], (old: any) => {
        if (!old) return old;
        const prevStatus = old.isFollowing;
        return {
          ...old,
          isFollowing: !prevStatus,
          followers: prevStatus ? old.followers - 1 : old.followers + 1
        };
      });
      return { previousStats };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousStats) {
        queryClient.setQueryData(['profileStats', userId, currentUserId], context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profileStats', userId, currentUserId] });
    }
  });

  const handleToggleFollow = () => {
    if (!currentUserId || currentUserId === userId) return;
    toggleFollowMutation.mutate();
  };

  const bannerScale = scrollY.interpolate({
    inputRange: [-BANNER_HEIGHT, 0],
    outputRange: [2, 1], // Kéo xuống hết cỡ thì phóng to gấp đôi
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  const bannerTranslateY = scrollY.interpolate({
    inputRange: [-BANNER_HEIGHT, 0],
    outputRange: [-BANNER_HEIGHT / 2, 0],
    extrapolateLeft: 'extend',
  });

  const headerBgColor = scrollY.interpolate({
    inputRange: [0, BANNER_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, BANNER_HEIGHT - 80, BANNER_HEIGHT - 40],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const renderHeader = () => {
    if (!profile) return null;
    const isOwner = currentUserId === userId;
    const isEmployer = profile.role === 'employer';

    return (
      <View style={styles.headerContent}>
        {/* BANNER SECTION */}
        <Animated.View style={[styles.bannerContainer, { transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }] }]}>
          <Image 
            source={{ uri: `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000` }} 
            style={styles.bannerImage} 
          />
          <View style={styles.bannerOverlay} />
        </Animated.View>

        {/* INFO CARD */}
        <View style={[styles.mainCard, { backgroundColor: theme.background }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarWrapper, { borderColor: theme.background }]}>
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarMain} />
              {isEmployer && (
                <View style={styles.verifiedBadge}>
                  <CheckCircle size={16} color="#FFF" fill="#8e44ad" />
                </View>
              )}
            </View>
            
            <View style={styles.headerActions}>
              {isOwner ? (
                <TouchableOpacity style={[styles.circleBtn, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                  <Edit3 size={20} color={theme.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.circleBtn, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                  <Share2 size={20} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.profileMeta}>
            <Text style={[styles.nameText, { color: theme.text }]}>{profile.full_name}</Text>
            <Text style={styles.handleText}>@{profile.username || 'user'}</Text>
            
            {isEmployer && (
              <View style={styles.companyTag}>
                <Briefcase size={14} color="#8e44ad" />
                <Text style={styles.companyNameText}>{profile.employers?.company_name}</Text>
              </View>
            )}

            <View style={styles.locationRow}>
              <MapPin size={14} color="#888" />
              <Text style={styles.locationText}>{profile.location || "Việt Nam"}</Text>
              <Calendar size={14} color="#888" style={{ marginLeft: 12 }} />
              <Text style={styles.locationText}>Gia nhập {new Date(profile.created_at).getMonth() + 1}/{new Date(profile.created_at).getFullYear()}</Text>
            </View>

            {profile.bio && <Text style={[styles.bioText, { color: theme.text }]}>{profile.bio}</Text>}

            {/* STATS */}
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statBox}>
                <Text style={[styles.statNum, { color: theme.text }]}>{stats.following}</Text>
                <Text style={styles.statLab}>Đang theo dõi</Text>
              </TouchableOpacity>
              <View style={[styles.vDivider, { backgroundColor: isDark ? '#6e6c6c' : '#d1cdcd' }]} />
              <TouchableOpacity style={styles.statBox}>
                <Text style={[styles.statNum, { color: theme.text }]}>{stats.followers}</Text>
                <Text style={styles.statLab}>Người theo dõi</Text>
              </TouchableOpacity>
            </View>

            {/* MAIN ACTIONS */}
            {!isOwner && (
              <View style={styles.mainActionRow}>
                <TouchableOpacity 
                  onPress={handleToggleFollow}
                  style={[styles.followBtn, isFollowing && styles.followingBtnActive]}
                >
                  <Text style={[styles.followBtnText, isFollowing && { color: "#8e44ad" }]}>
                    {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.msgBtn, { backgroundColor: isDark ? '#222' : '#F0F0F0' }]}>
                  <MessageSquare size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tabHeader}>
          <Text style={[styles.tabTitle, { color: theme.text }]}>
            {isEmployer ? "Bài đăng tuyển dụng" : "Hoạt động gần đây"}
          </Text>
          <View style={styles.tabUnderline} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* NAVBAR CONTAINER - Bọc toàn bộ vào đây */}
      <View style={[styles.navbar, { paddingTop: Platform.OS === 'ios' ? 50 : 35 }]}>
        
        {/* Lớp nền (Background) - Chỉ hiện khi kéo xuống */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFillObject, 
            { 
              backgroundColor: isDark ? '#111' : '#FFF', 
              opacity: headerBgColor, 
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }
          ]} 
        />

        {/* Nội dung Navbar: Back - Title - More */}
        <View style={styles.navContentRow}>
          <TouchableOpacity style={styles.navCircle} onPress={() => router.back()}>
            <ArrowLeft color={isDark ? "#FFF" : "#000"} size={22} />
          </TouchableOpacity>

          <Animated.View style={{ flex: 1, opacity: headerTitleOpacity, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }} numberOfLines={1}>
              {profile?.full_name || 'Hồ sơ'}
            </Text>
          </Animated.View>

          <TouchableOpacity style={styles.navCircle}>
            <MoreHorizontal color={isDark ? "#FFF" : "#000"} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#8e44ad" />
        </View>
      ) : (
        <Animated.FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isDark={isDark}
              theme={theme}
              isLiked={false}
              onPressPost={() => router.push(`/jobs/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ color: '#888' }}>Chưa có bài viết nào được đăng.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 0, zIndex: 100,
    height: Platform.OS === 'ios' ? 110 : 60,
  },
  navContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
  navCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContent: { width: '100%' },
  bannerContainer: { width: '100%', height: BANNER_HEIGHT },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  
  mainCard: {
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -45,
  },
  avatarWrapper: {
    padding: 4,
    borderRadius: 55,
    borderWidth: 4,
    position: 'relative'
  },
  avatarMain: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEE' },
  verifiedBadge: {
    position: 'absolute', bottom: 5, right: 5,
    backgroundColor: '#FFF', borderRadius: 10,
  },
  headerActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  profileMeta: { marginTop: 15 },
  nameText: { fontSize: 24, fontWeight: '900' },
  handleText: { fontSize: 14, color: '#8e44ad', fontWeight: '600', marginTop: 2 },
  companyTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  companyNameText: { fontWeight: '700', color: '#8e44ad', fontSize: 15 },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  locationText: { color: '#888', fontSize: 13, fontWeight: '500' },
  bioText: { marginTop: 15, fontSize: 14, lineHeight: 22, opacity: 0.9 },
  
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(142,68,173,0.05)',
    borderRadius: 26,
    paddingVertical: 10,
    marginTop: 20,
    alignItems: 'center'
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLab: { fontSize: 12, color: '#888', marginTop: 4, fontWeight: '600' },
  vDivider: { width: 2, height: 25 },
  
  mainActionRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
  followBtn: {
    flex: 1, height: 48, backgroundColor: '#8e44ad',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center'
  },
  followingBtnActive: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#DDD' },
  followBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  msgBtn: { width: 55, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  
  tabHeader: { paddingHorizontal: 20, marginTop: 30, marginBottom: 10 },
  tabTitle: { fontSize: 18, fontWeight: '800' },
  tabUnderline: { width: 40, height: 4, backgroundColor: '#8e44ad', borderRadius: 2, marginTop: 6 },
  emptyBox: { padding: 50, alignItems: 'center' }
});

export default ProfileScreen;