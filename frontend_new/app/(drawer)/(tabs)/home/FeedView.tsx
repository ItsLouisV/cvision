import {
  BellDot,
  Bookmark,
  CircleDollarSign,
  Ellipsis,
  EyeOff,
  Flag,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Share2,
  TextAlignStart,
  Verified,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PagerView from "react-native-pager-view";
import {
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Image,
  Modal,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextLayoutEventData,
  TouchableOpacity,
  View,
} from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Pressable as RNGHPressable } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import FeedSkeleton from "@/skeletons/FeedSkeleton";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { PostService } from "@/utils/postInteractionService";
import { FollowService } from "@/utils/followService";
import { formatSalary, formatTime } from "@/utils/formatters";
import { PostMenu } from "@/utils/PostMenu";
import { AvatarMenu } from "@/utils/AvatarMenu";
import * as Linking from "expo-linking";
import { PostCard, AvatarPosition } from "@/components/PostCard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { globalScrollY } from "@/utils/tabBarAnimation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_WIDTH = SCREEN_WIDTH / 2;

interface FeedViewProps {
  onPressMenu?: () => void;
  onPressSearch?: () => void;
  activeTab?: "all" | "following";
  onChangeTab?: (tab: "all" | "following") => void;
}

// ─────────────────────────────────────────────────────
// FeedView – main component
// ─────────────────────────────────────────────────────
const FeedView = ({ onPressMenu, activeTab, onChangeTab }: FeedViewProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { user } = useCurrentUser();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // ── REFS CHO SCROLL ĐỘC LẬP ──
  const scrollRefAll = useRef<ScrollView>(null);
  const scrollRefFollowing = useRef<ScrollView>(null);

  // ── PAGER VIEW ──
  const pagerRef = useRef<PagerView>(null);
  const pageScrollAnim = useRef(new Animated.Value(0)).current;
  const indicatorTranslateX = pageScrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_WIDTH],
  });

  const updatePostsOptimistically = (updater: (prev: any[]) => any[]) => {
    queryClient.setQueryData(["feed", "all", user?.id], (old: any[]) =>
      old ? updater(old) : old,
    );
    queryClient.setQueryData(["feed", "following", user?.id], (old: any[]) =>
      old ? updater(old) : old,
    );
  };
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<{
    [key: string]: boolean;
  }>({});
  const [followingUsers, setFollowingUsers] = useState<{
    [key: string]: boolean;
  }>({});
  const [hasUnread, setHasUnread] = useState(false);

  // Popup menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPost, setMenuPost] = useState<any>(null);

  // Avatar menu state
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [avatarMenuPost, setAvatarMenuPost] = useState<any>(null);
  const [avatarMenuPosition, setAvatarMenuPosition] =
    useState<AvatarPosition | null>(null);

  // Upload progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Header Animation
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 80; // 40 (header) + 40 (tabs)
  const scrollY = globalScrollY;

  // Lọc giá trị âm (overscroll pull-to-refresh iOS) để không ảnh hưởng đến diffClamp
  const scrollYPositive = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolateLeft: "clamp",
  });

  const clampedScrollY = Animated.diffClamp(scrollYPositive, 0, HEADER_HEIGHT);
  const headerTranslateY = clampedScrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: "clamp",
  });

  // ── FETCH DATA ──
  const checkUnreadNotifications = async () => {
    try {
      if (!user) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setHasUnread((count || 0) > 0);
    } catch (e) {
      console.log("Error checking notifications", e);
    }
  };

  const fetchJobsAPI = async (type: "all" | "following") => {
    const currentUserId = user?.id;

    let query = supabase
      .from("job_posts")
      .select(
        `*, employers (company_name, is_verified), user_profiles (id, full_name, avatar_url), total_likes:loved_posts(count), total_comments:comments(count)`,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (type === "following") {
      if (!currentUserId) return [];

      const { data: followings } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", currentUserId);
      const followingIds = followings?.map((f) => f.following_id) || [];

      if (followingIds.length === 0) return [];
      query = query.in("user_id", followingIds);
    }

    const { data: jobData, error } = await query;
    if (error) throw error;

    if (jobData) {
      const userLikedMap: Record<string, boolean> = {};
      const userSavedMap: Record<string, boolean> = {};
      const userFollowedMap: Record<string, boolean> = {};

      if (user) {
        const jobIds = jobData.map((j: any) => j.id);
        const userIds = jobData
          .map((j: any) => j.user_profiles?.id || j.user_id)
          .filter(Boolean);

        if (jobIds.length > 0) {
          const [likesRes, savesRes, followsRes] = await Promise.all([
            supabase
              .from("loved_posts")
              .select("post_id")
              .eq("user_id", currentUserId)
              .in("post_id", jobIds),
            supabase
              .from("saved_posts")
              .select("post_id")
              .eq("user_id", currentUserId)
              .in("post_id", jobIds),
            userIds.length > 0
              ? supabase
                  .from("followers")
                  .select("following_id")
                  .eq("follower_id", currentUserId)
                  .in("following_id", userIds)
              : Promise.resolve({ data: [] }),
          ]);
          likesRes.data?.forEach(
            (like: any) => (userLikedMap[like.post_id] = true),
          );
          savesRes.data?.forEach(
            (save: any) => (userSavedMap[save.post_id] = true),
          );
          followsRes.data?.forEach(
            (follow: any) => (userFollowedMap[follow.following_id] = true),
          );
        }
      }

      setLikedPosts((prev) => ({ ...prev, ...userLikedMap }));
      setBookmarkedPosts((prev) => ({ ...prev, ...userSavedMap }));
      setFollowingUsers((prev) => ({ ...prev, ...userFollowedMap }));

      return jobData.map((job: any) => ({
        id: job.id,
        userId: job.user_profiles?.id || job.user_id,
        userName:
          job.user_profiles?.full_name || job.company_name || "Người dùng",
        userAvatar:
          job.user_profiles?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(job.user_profiles?.full_name || job.company_name || "U")}&background=8e44ad&color=fff`,
        companyName: job.employers?.company_name || job.company_name || null,
        title: job.title,
        content: job.description,
        require: job.required_experience,
        time: formatTime(job.created_at, { short: true }),
        salary: formatSalary(
          job.salary_from,
          job.salary_to,
          job.currency,
          job.salary_unit,
        ),
        location: job.location || "Toàn quốc",
        type: job.job_type,
        category: job.category,
        is_verified: job.employers?.is_verified || false,
        likes: job.total_likes?.[0]?.count || 0,
        replies: job.total_comments?.[0]?.count || 0,
      }));
    }
    return [];
  };

  const {
    data: allPostsData,
    isLoading: isLoadingAll,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ["feed", "all", user?.id],
    queryFn: () => fetchJobsAPI("all"),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: followingPostsData,
    isLoading: isLoadingFollowing,
    refetch: refetchFollowing,
  } = useQuery({
    queryKey: ["feed", "following", user?.id],
    queryFn: () => fetchJobsAPI("following"),
    staleTime: 1000 * 60 * 5,
    enabled: !!user?.id,
  });

  // ── LIFECYCLE ──
  useEffect(() => {
    checkUnreadNotifications();
  }, [activeTab]);

  useEffect(() => {
    const channelName = `feed-bell-notifs-${Date.now()}`;
    console.log("🚀 Đang kết nối kênh mới:", channelName);
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => checkUnreadNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Listen for create-post events
  useEffect(() => {
    const subStart = DeviceEventEmitter.addListener("create_post_start", () => {
      setIsUploading(true);
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 4000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });
    const subSuccess = DeviceEventEmitter.addListener(
      "create_post_success",
      () => {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start(() => {
          setTimeout(() => {
            setIsUploading(false);
            onRefresh();
          }, 400);
        });
      },
    );
    const subError = DeviceEventEmitter.addListener(
      "create_post_error",
      (errorMsg) => {
        setIsUploading(false);
        Toast.show({
          type: "error",
          text1: "Bài viết không thể tải lên",
          text2: errorMsg || "Có lỗi xảy ra",
        });
      },
    );

    return () => {
      subStart.remove();
      subSuccess.remove();
      subError.remove();
    };
  }, []);

  // ── ACTIONS ──
  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (activeTab === "all") {
      await refetchAll();
    } else {
      await refetchFollowing();
    }
    checkUnreadNotifications();
    setRefreshing(false);
  };

  const handleDoubleTap = (tab: "all" | "following") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tab === "all") {
      scrollRefAll.current?.scrollTo({ y: 0, animated: true });
      refetchAll();
    } else {
      scrollRefFollowing.current?.scrollTo({ y: 0, animated: true });
      refetchFollowing();
    }
  };

  // ── PAGER VIEW HANDLERS ──
  const onPageScroll = (e: any) => {
    const { position, offset } = e.nativeEvent;
    pageScrollAnim.setValue(position + offset);
  };

  const onPageSelected = (e: any) => {
    const index = e.nativeEvent.position;
    const tab = index === 0 ? "all" : "following";
    onChangeTab?.(tab);
  };

  const goToPage = (index: number) => {
    pagerRef.current?.setPage(index);
  };

  const handleLike = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCurrentlyLiked = !!likedPosts[postId];

    // 🎯 Cập nhật màu sắc trái tim
    setLikedPosts((prev) => ({ ...prev, [postId]: !isCurrentlyLiked }));

    // 🎯 Cập nhật con số hiển thị trong danh sách bài viết (Optimistic UI)
    updatePostsOptimistically((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            likes: isCurrentlyLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          };
        }
        return p;
      }),
    );

    const result = await PostService.toggleLike(postId);

    if (result.error) {
      // Nếu lỗi, hoàn tác lại cả màu sắc và con số
      setLikedPosts((prev) => ({ ...prev, [postId]: isCurrentlyLiked }));
      updatePostsOptimistically((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id === postId) {
            return { ...p, likes: isCurrentlyLiked ? p.likes : p.likes - 1 };
          }
          return p;
        }),
      );
      Toast.show({
        type: "error",
        text1: "Lỗi rồi bạn ơi",
        text2: result.error,
      });
    }
  };

  const toggleBookmark = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCurrentlyBookmarked = !!bookmarkedPosts[postId];
    setBookmarkedPosts((prev) => ({
      ...prev,
      [postId]: !isCurrentlyBookmarked,
    }));

    const result = await PostService.toggleSave(postId);

    if (result.error) {
      // Nếu lỗi, hoàn tác lại UI
      setBookmarkedPosts((prev) => ({
        ...prev,
        [postId]: isCurrentlyBookmarked,
      }));
      Toast.show({
        type: "error",
        text1: "Opps! Lỗi rồi bạn ơi",
        text2: result.error || "Đã có lỗi xảy ra",
      });
    }
  };

  const onSharePost = async (company: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `[CVision] Cơ hội việc làm hấp dẫn: ${title} tại ${company}. Xem ngay trên App!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const onPressNotification = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notifications");
  };

  const handleMenuPress = () => {
    if (onPressMenu) onPressMenu();
  };

  const handleSearchPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/search/SearchView");
  };

  // ── POPUP MENU HANDLERS ──
  const openPostMenu = (post: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuPost(post);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setMenuPost(null);
  };

  const handleMenuAction = async (action: string) => {
    closeMenu();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (action) {
      case "share":
        if (menuPost) {
          await onSharePost(menuPost.companyName || "", menuPost.title);
        }
        break;
      case "copy_link":
        const url = Linking.createURL(`/jobs/${menuPost?.id}`);

        await Clipboard.setStringAsync(url);
        Toast.show({
          type: "success",
          text1: "Đã sao chép liên kết",
          visibilityTime: 1500,
        });
        break;
      case "hide":
        Toast.show({
          type: "info",
          text1: "Đã ẩn bài viết này",
          visibilityTime: 1500,
        });
        updatePostsOptimistically((prev) =>
          prev.filter((p) => p.id !== menuPost?.id),
        );
        break;
      case "report":
        Toast.show({
          type: "info",
          text1: "Cảm ơn bạn",
          text2: "Báo cáo của bạn đã được ghi nhận.",
          visibilityTime: 1500,
        });
        break;
    }
  };

  // ── AVATAR MENU HANDLERS ──
  const openAvatarMenu = (post: any, pos: AvatarPosition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAvatarMenuPost(post);
    setAvatarMenuPosition(pos);
    setAvatarMenuVisible(true);
  };

  const closeAvatarMenu = () => {
    setAvatarMenuVisible(false);
    setAvatarMenuPost(null);
  };

  const handleAvatarMenuAction = async (action: string) => {
    closeAvatarMenu();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!avatarMenuPost) return;
    const targetUserId = avatarMenuPost.userId;

    switch (action) {
      case "toggle_follow":
        if (!targetUserId) {
          Toast.show({ type: "error", text1: "Không thể theo dõi người này" });
          return;
        }

        const isCurrentlyFollowing = !!followingUsers[targetUserId];
        // Optimistic update
        setFollowingUsers((prev) => ({
          ...prev,
          [targetUserId]: !isCurrentlyFollowing,
        }));

        const result = await FollowService.toggleFollow(targetUserId);

        if (result.error) {
          // Hoàn tác
          setFollowingUsers((prev) => ({
            ...prev,
            [targetUserId]: isCurrentlyFollowing,
          }));
          Toast.show({
            type: "error",
            text1: "Lỗi rồi bạn ơi",
            text2: result.error,
          });
        } else {
          Toast.show({
            type: "success",
            text1: isCurrentlyFollowing ? "Đã bỏ theo dõi" : "Đã theo dõi",
            visibilityTime: 1500,
          });
        }
        break;
      case "visit_profile":
        if (!targetUserId) {
          Toast.show({
            type: "error",
            text1: "Không tìm thấy hồ sơ người này",
          });
          return;
        }
        // @ts-ignore: Dynamic route
        router.push(`/profile/${targetUserId}`);
        break;
    }
  };

  const renderEmptyFollowing = () => (
    <View style={styles.emptyContainer}>
      {/* Một Icon lớn để thu hút sự chú ý */}
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
        ]}
      >
        <Heart size={48} color={isDark ? "#444" : "#CCC"} strokeWidth={1.5} />
      </View>

      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Chưa có bài viết nào
      </Text>

      <Text style={styles.emptySubtitle}>
        Hãy theo dõi các chuyên gia và nhà tuyển dụng để cập nhật những cơ hội
        việc làm mới nhất dành riêng cho bạn.
      </Text>

      {/* Nút gợi ý hành động */}
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onChangeTab?.("all");
          goToPage(0); // Quay lại tab Khám phá
        }}
      >
        <RefreshCw size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.exploreBtnText}>Khám phá ngay</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFeedList = (
    type: "all" | "following",
    scrollRef: any,
    isLoadingList: boolean,
    dataList: any[] | undefined,
    emptyComponent: React.ReactNode,
  ) => (
    <Animated.ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: HEADER_HEIGHT + insets.top,
        paddingBottom: 100,
      }}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true },
      )}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={activeTab === type && refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? "#fff" : "#000"}
          progressViewOffset={HEADER_HEIGHT + insets.top}
        />
      }
    >
      {/* UPLOADING INDICATOR */}
      {isUploading && activeTab === type && (
        <View style={{ backgroundColor: isDark ? "#1C1C1E" : "#ebedf0" }}>
          <View
            style={[
              styles.uploadingBanner,
              { borderBottomWidth: 0, paddingVertical: 12 },
            ]}
          >
            <ActivityIndicator
              size="small"
              color="#8e44ad"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}
            >
              Louis AI đang tạo bài viết...
            </Text>
          </View>
          <View
            style={{
              height: 2.5,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
              width: "100%",
            }}
          >
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: "#8e44ad",
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        </View>
      )}

      {isLoadingList ? (
        <FeedSkeleton />
      ) : dataList && dataList.length > 0 ? (
        dataList.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isDark={isDark}
            theme={theme}
            isLiked={!!likedPosts[post.id]}
            isBookmarked={!!bookmarkedPosts[post.id]}
            onToggleLike={() => handleLike(post.id)}
            onToggleBookmark={() => toggleBookmark(post.id)}
            onShare={() => onSharePost(post.companyName || "", post.title)}
            onPressPost={() => router.push(`/jobs/${post.id}`)}
            onPressMenu={() => openPostMenu(post)}
            onPressAvatar={(pos) => openAvatarMenu(post, pos)}
          />
        ))
      ) : (
        emptyComponent
      )}
    </Animated.ScrollView>
  );

  // ── RENDER ──
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#F2F2F7" },
      ]}
    >
      {/* SOLID STATUS BAR BACKGROUND TO PREVENT CONTENT OVERLAP */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: isDark ? "#000" : "#F2F2F7",
          zIndex: 20,
        }}
      />

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top,
          backgroundColor: isDark ? "#000" : "#F2F2F7",
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0",
              backgroundColor: isDark ? "#000" : "#F2F2F7",
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={handleMenuPress}
              activeOpacity={0.7}
              style={styles.headerBtn}
            >
              <TextAlignStart size={24} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={onPressNotification}
                activeOpacity={0.7}
                style={[styles.headerBtn, { marginLeft: 12 }]}
              >
                <BellDot size={24} color={hasUnread ? "#e74c3c" : theme.text} />
                {hasUnread && <View style={styles.badge} />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSearchPress}
                activeOpacity={0.7}
                style={[styles.headerBtn, { marginLeft: 12 }]}
              >
                <Search size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.headerTabRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (activeTab === "all") handleDoubleTap("all");
              else goToPage(0);
            }}
            style={styles.tabItem}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && [
                  styles.activeTabText,
                  { color: theme.text },
                ],
              ]}
            >
              Dành cho bạn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (activeTab === "following") handleDoubleTap("following");
              else goToPage(1);
            }}
            style={styles.tabItem}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "following" && [
                  styles.activeTabText,
                  { color: theme.text },
                ],
              ]}
            >
              Đang theo dõi
            </Text>
          </TouchableOpacity>

          {/* Animated indicator – slides with PagerView swipe */}
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                backgroundColor: "#007AFF",
                width: TAB_WIDTH * 0.35,
                left: TAB_WIDTH * 0.325,
                transform: [{ translateX: indicatorTranslateX }],
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* FEED – PagerView for smooth horizontal swiping */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
        overdrag={false}
      >
        {/* Page 0: Dành cho bạn */}
        <View key="all" style={{ flex: 1 }}>
          {renderFeedList(
            "all",
            scrollRefAll,
            isLoadingAll,
            allPostsData,
            <View style={styles.emptyContainer}>
              <Text style={{ color: "#888" }}>Không có bài viết nào.</Text>
            </View>,
          )}
        </View>

        {/* Page 1: Đang theo dõi */}
        <View key="following" style={{ flex: 1 }}>
          {renderFeedList(
            "following",
            scrollRefFollowing,
            isLoadingFollowing,
            followingPostsData,
            renderEmptyFollowing(),
          )}
        </View>
      </PagerView>

      {/* ── POPUP MENUS ── */}
      <PostMenu
        visible={menuVisible}
        onClose={closeMenu}
        post={menuPost}
        theme={theme}
        isDark={isDark}
        onAction={handleMenuAction}
      />

      <AvatarMenu
        visible={avatarMenuVisible}
        onClose={closeAvatarMenu}
        post={avatarMenuPost}
        theme={theme}
        isDark={isDark}
        isFollowing={avatarMenuPost && followingUsers[avatarMenuPost.userId]}
        onAction={handleAvatarMenuAction}
        position={avatarMenuPosition}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: "transparent",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 40,
  },
  appLogoText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerTabRow: {
    flexDirection: "row",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(150,150,150,0.2)",
    position: "relative",
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93", // Màu xám iOS chuẩn
  },
  activeTabText: {
    fontWeight: "800",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    borderRadius: 2,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  headerBtn: { padding: 4, position: "relative" },
  badge: {
    position: "absolute",
    top: 5,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e74c3c",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },

  // ── Uploading ──
  uploadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreBtn: {
    flexDirection: "row",
    backgroundColor: "#8e44ad",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    // Shadow cho nút
    shadowColor: "#8e44ad",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default FeedView;
