import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { formatSalary } from "@/utils/formatters";
import { PostService } from "@/utils/postInteractionService";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Bookmark,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Save,
  Send,
  Share2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { ActionRow } from "@/components/ActionRow";
import { ApplyJobModal } from "@/components/ApplyJobModal";

const { width } = Dimensions.get("window");

const JobDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isLoved, setIsLoved] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current; // 0 = apply mode, 1 = send mode
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Determine if we're in "send mode" (show send icon) or "apply mode"
  const isOwner = currentUserId === job?.user_id || currentUserId === job?.user_profiles?.id;
  const isSendMode = inputFocused || commentText.trim().length > 0 || isOwner;

  // Animate expand when send mode changes
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isSendMode ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 60,
    }).start();
  }, [isSendMode]);

  // Track keyboard height to push bottom bar up
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 250 : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const onInputFocus = useCallback(() => {
    setInputFocused(true);
  }, []);

  const onInputBlur = useCallback(() => {
    setInputFocused(false);
  }, []);

  // Mock comments
  const MOCK_COMMENTS = [
    {
      id: "1",
      user: "Hoài Lâm",
      avatar: "https://i.pravatar.cc/150?u=1",
      content: "Cơ hội tuyệt vời, mong HR check CV giúp ạ!",
      time: "1 giờ trước",
    },
    {
      id: "2",
      user: "Lê Thanh Vũ",
      avatar: "https://i.pravatar.cc/150?u=2",
      content: "Dự án có sử dụng React Native hay hệ thống Web cũ vậy ạ?",
      time: "3 giờ trước",
    },
    {
      id: "3",
      user: "Thùy Chi",
      avatar: "https://i.pravatar.cc/150?u=3",
      content: "Tuyển vị trí Remote hay phải đến văn phòng thế?",
      time: "Hôm qua",
    },
  ];

  // Header blur on scroll
  const headerBg = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useFocusEffect(
    useCallback(() => {
      fetchJobDetail();
    }, [id])
  );

  const fetchJobDetail = async () => {
    try {
      const jobId = Array.isArray(id) ? id[0] : id;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // 🎯 Thêm user_profiles vào chuỗi select
      const { data, error } = await supabase
        .from("job_posts")
        .select(
          `
          *, 
          employers (
            company_name, 
            company_logo, 
            is_verified
          ),
          user_profiles:user_id (
            full_name, 
            avatar_url, 
            username
          )
        `,
        )
        .eq("id", jobId)
        .single();

      if (error) throw error;
      setJob(data);

      // Logic kiểm tra bài viết đã lưu giữ nguyên...
      if (user && data) {
        const { data: savedData } = await supabase
          .from("saved_posts")
          .select("id")
          .eq("user_id", user.id)
          .eq("post_id", jobId);
        setIsSaved(!!(savedData && savedData.length > 0));

        // Kiem tra cong viec da apply
        const { data: appData, error: appError } = await supabase
          .from("applications")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("job_id", jobId);
        if (appError) console.error("Error fetching applications:", appError);
        if (appData && appData.length > 0) {
          setHasApplied(true);
          setApplicationStatus(appData[0].status);
        } else {
          setHasApplied(false);
          setApplicationStatus(null);
        }
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    if (!job) return;
    try {
      await Share.share({
        message: `Cơ hội việc làm: ${job.title} tại ${job.employers?.company_name}. Xem chi tiết trên Louis AI!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Không xác định";
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const getJobTypeLabel = (val: string) => {
    switch (val?.toLowerCase()) {
      case "full-time":
        return "Toàn thời gian";
      case "part-time":
        return "Bán thời gian";
      case "contract":
        return "Hợp đồng";
      case "internship":
        return "Thực tập";
      case "freelance":
        return "Freelance";
      case "remote":
        return "Remote";
      default:
        return val || "Full-time";
    }
  };

  const toggleSave = async () => {
    if (!job) return;
    const prev = isSaved;
    setIsSaved(!prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await PostService.toggleSave(job.id);
    if (result.error) {
      setIsSaved(prev);
      Toast.show({
        type: "error",
        text1: "Opps! Lỗi rồi bạn ơi",
        text2: result.error || "Đã có lỗi xảy ra",
      });
    }
  };

  const handleRevokeApplication = async () => {
    try {
      const jobId = Array.isArray(id) ? id[0] : id;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      if (error) throw error;

      setHasApplied(false);
      setApplicationStatus(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: "success", text1: "Đã thu hồi hồ sơ ứng tuyển" });
    } catch (e: any) {
      console.error(e);
      Toast.show({ type: "error", text1: "Lỗi thu hồi", text2: e.message });
    }
  };

  // ── Loading ──
  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}>
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
      </View>
    );

  // ── Not found ──
  if (!job)
    return (
      <View style={[styles.center, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>
          Không tìm thấy công việc.
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.back();
          }}
          style={{
            marginTop: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#007AFF", fontWeight: "600", fontSize: 16 }}>
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>
    );

  const secondaryText = isDark ? "#8E8E93" : "#8E8E93";
  const separator = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const surfaceBg = isDark ? "#0d0d0d" : "#ebebef";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, height: insets.top + 48 },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerBg }]}>
          <BlurView
            intensity={isDark ? 40 : 80}
            style={StyleSheet.absoluteFill}
            tint={isDark ? "dark" : "light"}
          />
          <View style={[styles.headerLine, { backgroundColor: separator }]} />
        </Animated.View>

        <View style={styles.headerInner}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color={theme.text} />
          </TouchableOpacity>

          <Animated.Text
            style={[
              styles.headerTitleText,
              { color: theme.text, opacity: headerBg },
            ]}
            numberOfLines={1}
          >
            {job.title}
          </Animated.Text>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSave();
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Bookmark
              size={22}
              color={isSaved ? "#007AFF" : theme.text}
              fill={isSaved ? "#007AFF" : "none"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare();
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Share2 size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingBottom: 120,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Company + Title ── */}
        <View style={styles.topSection}>
          <View style={styles.companyRow}>
            <Image
              source={{
                uri:
                  job.user_profiles?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(job.user_profiles?.full_name || "H")}&background=007AFF&color=fff`,
              }}
              style={styles.companyLogo}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.companyNameRow}>
                <Text
                  style={[styles.companyName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {job.user_profiles?.full_name}
                </Text>
                {job.user_profiles?.is_verified && (
                  <CheckCircle2
                    size={16}
                    color="#007AFF"
                    fill="rgba(0,122,255,0.15)"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
              {/* <Text style={[styles.companyName, { color: theme.text }]}>
                {job.employers?.company_name}
              </Text> */}
              <Text style={[styles.postedTime, { color: secondaryText }]}>
                Đăng {formatDate(job.created_at)} · Hạn{" "}
                {formatDate(job.expired_at)}
              </Text>
            </View>
            <TouchableOpacity hitSlop={8}>
              <MoreHorizontal size={22} color={secondaryText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.jobTitle, { color: theme.text }]}>
            {job.title}
          </Text>

          {/* Quick tags */}
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: surfaceBg }]}>
              <CircleDollarSign size={14} color={secondaryText} />
              <Text style={[styles.tagText, { color: theme.text }]}>
                {formatSalary(
                  job.salary_from,
                  job.salary_to,
                  job.currency,
                  job.salary_unit,
                )}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: surfaceBg }]}>
              <Briefcase size={14} color={secondaryText} />
              <Text style={[styles.tagText, { color: theme.text }]}>
                {getJobTypeLabel(job.job_type)}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: surfaceBg }]}>
              <MapPin size={14} color={secondaryText} />
              <Text
                style={[styles.tagText, { color: theme.text }]}
                numberOfLines={1}
              >
                {job.location || "Remote"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.sep, { backgroundColor: separator }]} />

        {/* ── Mô tả ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Mô tả công việc
          </Text>
          <Text style={[styles.body, { color: theme.text }]}>
            {job.description}
          </Text>
        </View>

        {/* ── Yêu cầu ── */}
        {job.requirements && (
          <>
            <View style={[styles.sep, { backgroundColor: separator }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Yêu cầu ứng viên
              </Text>
              <Text style={[styles.body, { color: theme.text }]}>
                {job.requirements}
              </Text>
            </View>
          </>
        )}

        {/* ── Action row (like Threads) ── */}
        <ActionRow
          isDark={isDark}
          isLiked={isLoved}
          onLike={toggleSave}
          onComment={() => {}}
          onShare={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onShare();
          }}
          shareIcon="share2"
          style={[styles.actionsRow, { backgroundColor: surfaceBg }]}
        />

        {/* ── Comments ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Bình luận · {MOCK_COMMENTS.length}
          </Text>

          {MOCK_COMMENTS.map((cmt) => (
            <View key={cmt.id} style={styles.comment}>
              <Image
                source={{ uri: cmt.avatar }}
                style={styles.commentAvatar}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.commentTop}>
                  <Text style={[styles.commentName, { color: theme.text }]}>
                    {cmt.user}
                  </Text>
                  <Text style={[styles.commentTime, { color: secondaryText }]}>
                    {cmt.time}
                  </Text>
                </View>
                <Text style={[styles.commentBody, { color: theme.text }]}>
                  {cmt.content}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* ── FIXED BOTTOM BAR ── */}
      <Animated.View
        style={[
          styles.bottomBar,
          {
            paddingBottom:
              Platform.OS === "ios" ? (insets.bottom || 12) + 4 : 14,
          },
        ]}
      >
        <BlurView
          intensity={isDark ? 50 : 90}
          style={StyleSheet.absoluteFill}
          tint={isDark ? "dark" : "light"}
        />
        <View style={[styles.bottomLine, { backgroundColor: separator }]} />

        <View style={styles.bottomInner}>
          {/* Comment Input */}
          <Animated.View
            style={[
              styles.bottomInputWrap,
              {
                backgroundColor: surfaceBg,
                borderColor: isSendMode ? "#007AFF" : separator,
                flex: 1,
                marginRight: 10,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              placeholder="Viết bình luận..."
              placeholderTextColor={secondaryText}
              style={[styles.bottomInput, { color: theme.text }]}
              value={commentText}
              onChangeText={setCommentText}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              multiline
            />
          </Animated.View>

          {/* Apply Button / Send Button */}
          <Animated.View
            style={{
              width: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [(width - 32 - 10) / 2, 48],
              }),
              height: 48,
            }}
          >
            <TouchableOpacity
              style={[
                styles.applyBtn,
                { 
                  backgroundColor: isSendMode 
                    ? "#007AFF" 
                    : hasApplied 
                      ? (applicationStatus === "pending" ? "#e74c3c" : separator) 
                      : "#007AFF" 
                },
              ]}
              onPress={() => {
                if (isSendMode) {
                  if (commentText.trim()) {
                    // Send comment
                    setCommentText("");
                    inputRef.current?.blur();
                  }
                } else if (hasApplied && applicationStatus === "pending") {
                  Alert.alert(
                    "Đã nghĩ kĩ chưa? Thu hồi nhá!!",
                    "Bạn có chắc chắn muốn thu hồi hồ sơ ứng tuyển này không?",
                    [
                      { text: "Không", style: "cancel" },
                      {
                        text: "Thu hồi",
                        style: "destructive",
                        onPress: handleRevokeApplication,
                      },
                    ]
                  );
                } else if (!hasApplied) {
                  setIsApplyModalVisible(true);
                }
              }}
              activeOpacity={0.8}
              disabled={hasApplied && applicationStatus !== "pending" && !isSendMode}
            >
              {isSendMode ? (
                <Send
                  size={20}
                  color={commentText.trim() ? "#FFF" : "rgba(255,255,255,0.4)"}
                />
              ) : (
                <Text style={[styles.applyText, hasApplied && applicationStatus !== "pending" && { color: secondaryText }]} numberOfLines={1}>
                  {hasApplied ? (applicationStatus === "pending" ? "Thu hồi" : "Đã tiếp nhận") : "Ứng tuyển ngay"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      {/* MODAL ỨNG TUYỂN */}
      <ApplyJobModal
        visible={isApplyModalVisible}
        onClose={() => setIsApplyModalVisible(false)}
        jobId={id as string}
        jobOwnerId={job?.user_id || job?.user_profiles?.id}
        jobTitle={job?.title || ""}
        isDark={isDark}
        theme={theme}
        onSuccess={() => {
          setHasApplied(true);
          setApplicationStatus("pending");
        }}
      />
    </KeyboardAvoidingView>
  );
};

export default JobDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Header ──
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },

  // ── Top section ──
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#E5E5EA",
  },
  companyNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "700",
  },
  postedTime: {
    fontSize: 13,
    marginTop: 2,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 14,
    letterSpacing: -0.2,
  },

  // ── Tags ──
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Separator ──
  sep: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },

  // ── Section ──
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },

  // ── Action row ──
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-around",
    borderRadius: 25,
    marginHorizontal: 5,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Comments ──
  comment: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#E5E5EA",
  },
  commentTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  commentName: {
    fontSize: 14,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 12,
  },
  commentBody: {
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.9,
  },
  // ── Bottom bar ──
  bottomBar: {
    // position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  bottomLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  bottomInner: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  bottomInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingRight: 5,
    paddingLeft: 16,
    minHeight: 48,
    borderWidth: 1,
    overflow: "hidden",
  },
  bottomInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
    maxHeight: 150,
  },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  applyText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
