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

import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import FeedSkeleton from "@/skeletons/FeedSkeleton";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { PostService } from "@/utils/postInteractionService";
import * as Linking from "expo-linking";

const { width } = Dimensions.get("window");

interface FeedViewProps {
  onPressMenu?: () => void;
  onPressSearch?: () => void;
}

const JOB_TYPE_MAP: Record<string, string> = {
  "full-time": "Toàn thời gian",
  "part-time": "Bán thời gian",
  contract: "Hợp đồng",
  internship: "Thực tập",
  freelance: "Freelance",
  remote: "Remote",
};

const MAX_CONTENT_LINES = 5;



const PressableOpacity = ({
  children,
  style,
  activeOpacity = 0.7,
  ...props
}: any) => {
  return (
    <Pressable
      {...props}
      android_ripple={{ color: 'rgba(142,68,173,0.15)', borderless: true, radius: 22 }}
      style={({ pressed }) => [
        typeof style === "function" ? style({ pressed }) : style,
        pressed && Platform.OS === 'ios' && { opacity: activeOpacity },
      ]}
    >
      {children}
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────
// PostCard – extracted component for a single post
// ─────────────────────────────────────────────────────
interface PostCardProps {
  post: any;
  isDark: boolean;
  theme: any;
  isLiked: boolean;
  isBookmarked: boolean;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onShare: () => void;
  onPressPost: () => void;
  onPressMenu: () => void;
}

const PostCard = React.memo(
  ({
    post,
    isDark,
    theme,
    isLiked,
    isBookmarked,
    onToggleLike,
    onToggleBookmark,
    onShare,
    onPressPost,
    onPressMenu,
  }: PostCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);

    const handleTextLayout = useCallback(
      (e: NativeSyntheticEvent<TextLayoutEventData>) => {
        if (e.nativeEvent.lines.length > MAX_CONTENT_LINES) {
          setIsClamped(true);
        }
      },
      [],
    );

    const toggleExpand = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsExpanded((prev) => !prev);
    };

    return (
      <View style={styles.postWrapper}>
        {/* LEFT COLUMN – AVATAR (tappable → navigate to post) */}
        <Pressable
          onPress={onPressPost}
          style={({ pressed }) => [
            styles.leftColumn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.avatarContainer}>
            <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
            {post.is_verified && (
              <View
                style={[
                  styles.verifiedIcon,
                  { backgroundColor: isDark ? "#1C1C1E" : "#FFF" },
                ]}
              >
                <Verified
                  size={14}
                  color="#8e44ad"
                  fill={isDark ? "#1C1C1E" : "#FFF"}
                />
              </View>
            )}
          </View>
        </Pressable>

        {/* RIGHT COLUMN – CONTENT */}
        <View
          style={[
            styles.rightColumn,
            { borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0" },
          ]}
        >
          {/* USER ROW: name · company badge · time · ellipsis */}
          <View style={styles.userRow}>
            {/* Tapping name/company → navigate to post */}
            <Pressable
              style={({ pressed }) => [
                styles.userInfo,
                pressed && { opacity: 0.7 },
              ]}
              onPress={onPressPost}
            >
              <Text
                style={[styles.userName, { color: theme.text }]}
                numberOfLines={1}
              >
                {post.userName}
              </Text>
              {post.companyName ? (
                <View
                  style={[
                    styles.companyBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(142,68,173,0.15)"
                        : "rgba(142,68,173,0.08)",
                    },
                  ]}
                >
                  <Text style={styles.companyBadgeText} numberOfLines={1}>
                    {post.companyName}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <View style={styles.userRowRight}>
              <Text
                style={[styles.timeText, { color: isDark ? "#666" : "#999" }]}
              >
                {post.time}
              </Text>
              <PressableOpacity
                onPress={onPressMenu}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 6, marginLeft: 4 }}
              >
                <Ellipsis size={18} color={isDark ? "#666" : "#999"} />
              </PressableOpacity>
            </View>
          </View>

          {/* JOB TITLE – tappable → navigate */}
          <Pressable
            onPress={onPressPost}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={[styles.jobTitle, { color: theme.text }]}>
              {post.title}
            </Text>

            {/* CONTENT – clamped text */}
            <Text
              style={[styles.postContent, { color: theme.text }]}
              numberOfLines={isExpanded ? undefined : MAX_CONTENT_LINES}
              onTextLayout={handleTextLayout}
            >
              {post.content}
            </Text>
          </Pressable>

          {isClamped && (
            <PressableOpacity onPress={toggleExpand} activeOpacity={0.7}>
              <Text style={styles.seeMoreText}>
                {isExpanded ? "Thu gọn" : "Xem thêm"}
              </Text>
            </PressableOpacity>
          )}

          {/* JOB META */}
          <View style={styles.jobMetaRow}>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark
                    ? "rgba(142,68,173,0.12)"
                    : "rgba(142,68,173,0.06)",
                },
              ]}
            >
              <Text style={styles.metaChipText}>
                {JOB_TYPE_MAP[post.type] || post.type}
              </Text>
            </View>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark
                    ? "rgba(142,68,173,0.12)"
                    : "rgba(142,68,173,0.06)",
                },
              ]}
            >
              <CircleDollarSign size={13} color="#8e44ad" />
              <Text style={styles.metaChipText}>{post.salary}</Text>
            </View>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark
                    ? "rgba(142,68,173,0.12)"
                    : "rgba(142,68,173,0.06)",
                },
              ]}
            >
              <MapPin size={13} color="#8e44ad" />
              <Text style={styles.metaChipText}>{post.location}</Text>
            </View>
          </View>

          {/* ACTIONS – độc lập, không nằm trong Pressable cha */}
          <View style={styles.actionContainer}>
            <View style={styles.actionRow}>
              <PressableOpacity
                style={styles.actionBtn}
                onPress={onToggleLike}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Heart
                  size={20}
                  color={isLiked ? "#e74c3c" : isDark ? "#888" : "#666"}
                  fill={isLiked ? "#e74c3c" : "transparent"}
                />
                {post.likes > 0 && (
                  <Text
                    style={[
                      styles.actionCount,
                      { color: isLiked ? "#e74c3c" : isDark ? "#888" : "#666" },
                    ]}
                  >
                    {post.likes}
                  </Text>
                )}
              </PressableOpacity>

              <PressableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MessageCircle size={19} color={isDark ? "#888" : "#666"} />
                {post.replies > 0 && (
                  <Text
                    style={[
                      styles.actionCount,
                      { color: isDark ? "#888" : "#666" },
                    ]}
                  >
                    {post.replies}
                  </Text>
                )}
              </PressableOpacity>

              <PressableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <RefreshCw size={19} color={isDark ? "#888" : "#666"} />
              </PressableOpacity>

              <PressableOpacity
                style={styles.actionBtn}
                onPress={onShare}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Send size={19} color={isDark ? "#888" : "#666"} />
              </PressableOpacity>
            </View>

            <PressableOpacity
              style={styles.actionBtnRight}
              onPress={onToggleBookmark}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bookmark
                size={20}
                color={isBookmarked ? "#FFD700" : isDark ? "#888" : "#666"}
                fill={isBookmarked ? "#FFD700" : "transparent"}
              />
            </PressableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────
// FeedView – main component
// ─────────────────────────────────────────────────────
const FeedView = ({ onPressMenu, onPressSearch }: FeedViewProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<{
    [key: string]: boolean;
  }>({});
  const [hasUnread, setHasUnread] = useState(false);

  // Popup menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPost, setMenuPost] = useState<any>(null);

  // Upload progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── FETCH DATA ──
  const checkUnreadNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  const fetchJobs = async () => {
    try {
      // 🎯 Bước 1: Reset sạch State cũ để tránh dữ liệu tài khoản trước còn sót lại
      setLikedPosts({});
      setBookmarkedPosts({});

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data: jobData, error } = await supabase
        .from("job_posts")
        .select(
          `
        *,
        employers (company_name, is_verified),
        user_profiles (full_name, avatar_url),
        total_likes:loved_posts(count),
        total_comments:comments(count)
      `,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (jobData) {
        // 🎯 Bước 2: Khởi tạo Map mới hoàn toàn
        const userLikedMap: Record<string, boolean> = {};
        const userSavedMap: Record<string, boolean> = {};

        // Chỉ lấy lượt like và save nếu có user đăng nhập
        if (user) {
          const jobIds = jobData.map((j: any) => j.id);
          if (jobIds.length > 0) {
            const [likesRes, savesRes] = await Promise.all([
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
            ]);
            likesRes.data?.forEach((like: any) => {
              userLikedMap[like.post_id] = true;
            });
            savesRes.data?.forEach((save: any) => {
              userSavedMap[save.post_id] = true;
            });
          }
        }

        const formattedPosts = jobData.map((job: any) => {
          const isLikedByMe = !!userLikedMap[job.id];
          const isSavedByMe = !!userSavedMap[job.id];

          return {
            id: job.id,
            userName:
              job.user_profiles?.full_name || job.company_name || "Người dùng",
            userAvatar:
              job.user_profiles?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(job.user_profiles?.full_name || job.company_name || "U")}&background=8e44ad&color=fff`,
            companyName:
              job.employers?.company_name || job.company_name || null,
            title: job.title,
            content: job.description,
            require: job.required_experience,
            time: formatTime(job.created_at),
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
          };
        });

        // 🎯 Bước 3: Cập nhật đồng loạt các State
        setPosts(formattedPosts);
        setLikedPosts(userLikedMap);
        setBookmarkedPosts(userSavedMap);
      }
    } catch (error) {
      console.error("Fetch jobs error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ── HELPERS ──
  const formatSalary = (
    from: number | null,
    to: number | null,
    currency: string = "VNĐ",
    unit: string = "month",
  ) => {
    if (!from && !to) return "Thỏa thuận";
    if (unit === "negotiable") return "Thỏa thuận";

    const isVND =
      currency.toUpperCase() === "VNĐ" || currency.toUpperCase() === "VND";
    const isUSD = currency.toUpperCase() === "USD";
    const isHourly = unit.toLowerCase() === "hour";

    let fStr = "";
    let tStr = "";

    if (isVND) {
      if (isHourly) {
        // Tiền lương theo giờ (VND): Giữ nguyên số gốc, thêm dấu ngăn cách phần nghìn.
        fStr = from ? from.toLocaleString() : "?";
        tStr = to ? to.toLocaleString() : "?";
      } else {
        // Tiền lương theo tháng/năm (VND): Chia cho 1,000,000 để lấy đơn vị "triệu"
        fStr = from ? (from / 1000000).toFixed(0) : "?";
        tStr = to ? (to / 1000000).toFixed(0) : "?";
      }
    } else {
      // Ngoại tệ: Luôn giữ nguyên số gốc và thêm dấu phẩy ngăn cách phần nghìn
      fStr = from
        ? from.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })
        : "?";
      tStr = to
        ? to.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })
        : "?";
    }

    // Nối chuỗi tiền tệ (Nếu là VND thì mượn chữ 'triệu', USD thì giữ nguyên số gốc)
    let salaryText = "";
    if (isVND) {
      salaryText = isHourly
        ? `${fStr} - ${tStr} VNĐ`
        : `${fStr} - ${tStr} triệu`;
    } else if (isUSD) {
      salaryText = `$${fStr} - $${tStr}`;
    } else {
      salaryText = `${fStr} - ${tStr} ${currency}`;
    }

    // Nối Đơn vị tính
    const unitMap: any = {
      hour: "/ giờ",
      month: "/ tháng",
      year: "/ năm",
      day: "/ ngày",
      project: "/ dự án",
    };

    const unitText = unitMap[unit] || "";
    return `${salaryText} ${unitText}`.trim();
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMin = Math.floor((now.getTime() - past.getTime()) / 60000);

    if (diffInMin < 1) return "vừa xong";
    if (diffInMin < 60) return `${diffInMin}p`;
    const diffInHours = Math.floor(diffInMin / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)} ngày`;
  };

  // ── LIFECYCLE ──
  useEffect(() => {
    fetchJobs();
    checkUnreadNotifications();

    const channel = supabase
      .channel("feed-bell-notifications")
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
  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchJobs();
    checkUnreadNotifications();
  };

  const handleLike = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isCurrentlyLiked = !!likedPosts[postId];

    // 🎯 Cập nhật màu sắc trái tim
    setLikedPosts((prev) => ({ ...prev, [postId]: !isCurrentlyLiked }));

    // 🎯 Cập nhật con số hiển thị trong danh sách bài viết (Optimistic UI)
    setPosts((prevPosts) =>
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
      setPosts((prevPosts) =>
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
        setPosts((prev) => prev.filter((p) => p.id !== menuPost?.id));
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

  // ── RENDER ──
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0" },
        ]}
      >
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

      {/* UPLOADING INDICATOR */}
      {isUploading && (
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

      {/* FEED */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#fff" : "#000"}
          />
        }
      >
        {isLoading ? (
          <FeedSkeleton />
        ) : (
          posts.map((post) => (
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
            />
          ))
        )}
      </ScrollView>

      {/* ── POPUP MENU MODAL ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Pressable
            style={[
              styles.menuSheet,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
            ]}
            onPress={() => {}}
          >
            {/* Drag handle */}
            <View style={styles.menuHandle} />

            {menuPost && (
              <View style={styles.menuPostPreview}>
                <Image
                  source={{ uri: menuPost.userAvatar }}
                  style={styles.menuAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.menuPostName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {menuPost.userName}
                  </Text>
                  <Text
                    style={[
                      styles.menuPostTitle,
                      { color: isDark ? "#aaa" : "#666" },
                    ]}
                    numberOfLines={1}
                  >
                    {menuPost.title}
                  </Text>
                </View>
              </View>
            )}

            <View
              style={[
                styles.menuDivider,
                { backgroundColor: isDark ? "#333" : "#eee" },
              ]}
            />

            {[
              {
                key: "share",
                icon: <Share2 size={20} color={theme.text} />,
                label: "Chia sẻ bài viết",
              },
              {
                key: "copy_link",
                icon: <Link2 size={20} color={theme.text} />,
                label: "Sao chép liên kết",
              },
              {
                key: "hide",
                icon: <EyeOff size={20} color={theme.text} />,
                label: "Ẩn bài viết này",
              },
              {
                key: "report",
                icon: <Flag size={20} color="#e74c3c" />,
                label: "Báo cáo",
                isDestructive: true,
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  index === 3 && { borderBottomWidth: 0 },
                  { borderBottomColor: isDark ? "#2C2C2E" : "#f0f0f0" },
                ]}
                onPress={() => handleMenuAction(item.key)}
                activeOpacity={0.7}
              >
                {item.icon}
                <Text
                  style={[
                    styles.menuItemText,
                    {
                      color: (item as any).isDestructive
                        ? "#e74c3c"
                        : theme.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.menuCancelBtn,
                { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
              ]}
              onPress={closeMenu}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuCancelText, { color: theme.text }]}>
                Hủy
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 54,
    borderBottomWidth: 0.5,
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

  // ── Post Card ──
  postWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
  },
  leftColumn: { alignItems: "center", width: 45 },
  avatarContainer: { width: 42, height: 42, position: "relative" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eee",
  },
  verifiedIcon: {
    position: "absolute",
    bottom: -3,
    right: -3,
    borderRadius: 10,
    padding: 1,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },

  // ── User row ──
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: { fontWeight: "800", fontSize: 15 },
  companyBadge: {
    alignSelf: "flex-start",
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8e44ad",
  },
  userRowRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  timeText: { fontSize: 13, fontWeight: "400" },

  // ── Job content ──
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  postContent: {
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
    opacity: 0.8,
  },
  seeMoreText: {
    color: "#8e44ad",
    fontWeight: "600",
    fontSize: 13.5,
    marginTop: 3,
  },

  // ── Meta chips ──
  jobMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8e44ad",
  },

  // ── Actions ──
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginLeft: -4,
  },
  actionRow: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    padding: 4,
  },
  actionBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  actionCount: { fontSize: 13, marginLeft: 5, fontWeight: "500" },

  // ── Uploading ──
  uploadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Popup Menu ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 10,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
    alignSelf: "center",
    marginBottom: 14,
    opacity: 0.4,
  },
  menuPostPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  menuAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eee",
  },
  menuPostName: { fontWeight: "700", fontSize: 14 },
  menuPostTitle: { fontSize: 12, marginTop: 1 },
  menuDivider: { height: 0.5, marginBottom: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  menuItemText: { fontSize: 15, fontWeight: "500" },
  menuCancelBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuCancelText: { fontSize: 16, fontWeight: "700" },
});

export default FeedView;
