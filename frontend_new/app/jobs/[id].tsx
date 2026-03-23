import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  Send,
  Bookmark,
  Clock,
  Building2,
} from "lucide-react-native";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

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

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;

  // Mock comments
  const MOCK_COMMENTS = [
    { id: '1', user: 'Hoài Lâm', avatar: 'https://i.pravatar.cc/150?u=1', content: 'Cơ hội tuyệt vời, mong HR check CV giúp ạ!', time: '1 giờ trước' },
    { id: '2', user: 'Lê Thanh Vũ', avatar: 'https://i.pravatar.cc/150?u=2', content: 'Dự án có sử dụng React Native hay hệ thống Web cũ vậy ạ?', time: '3 giờ trước' },
    { id: '3', user: 'Thùy Chi', avatar: 'https://i.pravatar.cc/150?u=3', content: 'Tuyển vị trí Remote hay phải đến văn phòng thế?', time: 'Hôm qua' },
  ];

  // Header Animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [40, 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [40, 90],
    outputRange: [15, 0],
    extrapolate: 'clamp',
  });

  const logoScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("job_posts")
        .select(`*, employers (company_name, company_logo, is_verified)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      setJob(data);
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

  // Helper Formatters - Đã cập nhật logic USD/VND/Hourly cho Louis
  const formatSalary = (from: number | null, to: number | null, currency: string = "VNĐ", unit: string = "month") => {
    if (!from && !to) return "Thỏa thuận";
    if (unit === "negotiable") return "Thỏa thuận";

    const isVND = currency?.toUpperCase() === "VNĐ" || currency?.toUpperCase() === "VND";
    const isUSD = currency?.toUpperCase() === "USD";
    const isHourly = unit === "hour";

    let fStr = "";
    let tStr = "";

    if (isVND) {
      if (isHourly) {
        // Lương giờ VND: Hiện số gốc có dấu chấm (Ví dụ: 25.000)
        fStr = from ? from.toLocaleString("vi-VN") : "?";
        tStr = to ? to.toLocaleString("vi-VN") : "?";
      } else {
        // Lương tháng/năm VND: Chia cho 1 triệu
        fStr = from ? (from / 1000000).toFixed(0) : "?";
        tStr = to ? (to / 1000000).toFixed(0) : "?";
      }
    } else {
      // USD hoặc ngoại tệ: Giữ nguyên số gốc, hiển thị tối đa 1 số lẻ (Ví dụ: 12.5)
      fStr = from ? from.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "?";
      tStr = to ? to.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "?";
    }
    
    // Ghép chuỗi tiền tệ
    let salaryText = "";
    if (isVND) {
      salaryText = isHourly ? `${fStr} - ${tStr} đ` : `${fStr} - ${tStr} triệu`;
    } else if (isUSD) {
      salaryText = `$${fStr} - $${tStr}`;
    } else {
      salaryText = `${fStr} - ${tStr} ${currency}`;
    }

    // Đơn vị thời gian
    const unitMap: any = { 
      hour: "/ giờ",
      day: "/ ngày",
      month: "/ tháng", 
      year: "/ năm", 
      project: "/ dự án" 
    };
    const unitText = unitMap[unit] || "";
    
    return `${salaryText} ${unitText}`.trim();
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

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color="#8e44ad" />
    </View>
  );

  if (!job) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text, fontSize: 16 }}>Không tìm thấy công việc.</Text>
      <TouchableOpacity onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.back()
        }} style={{ marginTop: 20, padding: 12, backgroundColor: '#8e44ad', borderRadius: 8 }
      }>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* --- CUSTOM HEADER WITH BLUR --- */}
      <View style={[styles.headerContainer, { paddingTop: insets.top, height: insets.top + 54 }]}>
        {/* Background Blur View bound to scrollY */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
           <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
           {/* Thêm shadow/border tinh tế khi cuộn */}
           <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }} />
        </Animated.View>

        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back()
          }} style={styles.circleBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              styles.headerCenter, 
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <Image 
              source={{ uri: job.employers?.company_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.employers?.company_name|| 'H')}&background=8e44ad&color=fff` }} 
              style={styles.headerSmallLogo} 
            />
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {job.employers?.company_name}
            </Text>
          </Animated.View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsSaved(!isSaved)
            }} style={styles.circleBtn}>
              <Bookmark size={20} color={isSaved ? "#8e44ad" : theme.text} fill={isSaved ? "#8e44ad" : "none"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShare()
            }} style={[styles.circleBtn, { marginLeft: 8 }]}>
              <Share2 size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: 150 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* --- MAIN INFO SECTION --- */}
        <View style={styles.mainInfoCard}>
          <Animated.Image 
            source={{ uri: job.employers?.company_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.employers?.company_name|| 'H')}&background=8e44ad&color=fff` }} 
            style={[styles.mainLogo, { transform: [{ scale: logoScale }] }]} 
          />
          <Text style={[styles.jobTitleLarge, { color: theme.text }]}>{job.title}</Text>
          <View style={styles.companyBadge}>
            <Text style={styles.companyNameText}>{job.employers?.company_name}</Text>
            {job.employers?.is_verified && <CheckCircle2 size={14} color="#8e44ad" style={{ marginLeft: 4 }} />}
          </View>
        </View>

        {/* --- QUICK STATS GRID --- */}
        <View style={styles.statsContainer}>
          {/* Hàng 1: Hai cột cho thông tin ngắn */}
          <View style={styles.statsRow}>
            <StatBox 
              icon={<Clock size={20} color="#f39c12" />} 
              label="Hạn chót nhận hồ sơ" 
              value={formatDate(job.expired_at)} 
              isDark={isDark} 
              halfWidth
            />
            
            <StatBox 
              icon={<Briefcase size={20} color="#8e44ad" />} 
              label="Hình thức" 
              value={getJobTypeLabel(job.job_type)} 
              isDark={isDark} 
              halfWidth 
            />
          </View>

          {/* Hàng 2: Full width cho Địa điểm để tránh bị cắt chữ */}
          <StatBox 
            icon={<MapPin size={20} color="#e74c3c" />} 
            label="Địa điểm làm việc" 
            value={job.location || "Toàn quốc / Remote"} 
            isDark={isDark} 
          />

          {/* Hàng 3: Có thể để Hạn nộp ở đây hoặc ghép lên trên tùy Louis */}
          <StatBox 
              icon={<CircleDollarSign size={20} color="#27ae60" />} 
              label="Mức lương" 
              value={formatSalary(job.salary_from, job.salary_to, job.currency, job.salary_unit)} 
              isDark={isDark} 
            />
        </View>

        {/* --- AI MATCHING SECTION --- */}
        <View style={[styles.aiSection, { backgroundColor: isDark ? '#2D1B4E' : '#F5F0FF' }]}>
          <View style={styles.aiHeader}>
            <Sparkles size={22} color="#8e44ad" />
            <Text style={styles.aiTitle}>Phân tích bởi Louis AI</Text>
          </View>
          <Text style={[styles.aiDescription, { color: isDark ? '#D4B0FF' : '#6A1B9A' }]}>
            Dựa trên CV của bạn, Louis AI đánh giá mức độ phù hợp là **85%**. Bạn có lợi thế phù hợp với yêu cầu của vị trí này.
          </Text>
        </View>

        {/* --- JOB DESCRIPTION --- */}
        <View style={styles.sectionContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Building2 size={20} color={theme.text} />
            <Text style={[styles.sectionHeading, { color: theme.text, marginLeft: 8 }]}>Mô tả công việc</Text>
          </View>
          <Text style={[styles.bodyText, { color: theme.text }]}>{job.description}</Text>
        </View>

        {/* --- JOB REQUIREMENTS --- */}
        {job.requirements && (
          <View style={styles.sectionContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <CheckCircle2 size={20} color={theme.text} />
              <Text style={[styles.sectionHeading, { color: theme.text, marginLeft: 8 }]}>Yêu cầu ứng viên</Text>
            </View>
            <Text style={[styles.bodyText, { color: theme.text }]}>{job.requirements}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* --- COMMENTS SECTION --- */}
        <View style={styles.commentsContainer}>
          <Text style={[styles.sectionHeading, { color: theme.text, marginBottom: 16 }]}>Thảo luận ({MOCK_COMMENTS.length})</Text>
          {MOCK_COMMENTS.map((cmt) => (
            <View key={cmt.id} style={styles.commentCard}>
              <Image source={{ uri: cmt.avatar }} style={styles.commentAvatar} />
              <View style={[styles.commentContent, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                <View style={styles.commentHeaderRow}>
                   <Text style={[styles.commentUser, { color: theme.text }]}>{cmt.user}</Text>
                </View>
                <Text style={[styles.commentText, { color: isDark ? '#ddd' : '#333' }]}>{cmt.content}</Text>
                <Text style={styles.commentTimeText}>{cmt.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* --- FLOATING ACTION BAR + COMMENT INPUT --- */}
      <View style={[styles.footerWrapper, { backgroundColor: theme.background, borderTopColor: isDark ? '#333' : '#E5E5EA', paddingBottom: Platform.OS === "ios" ? insets.bottom || 20 : 20 }]}>
        
        {/* THANH NHẬP BÌNH LUẬN */}
        <View style={[styles.inputRow, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
          <TextInput
            placeholder="Viết bình luận của bạn..."
            placeholderTextColor="#888"
            style={[styles.textInput, { color: theme.text }]}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendIconBtn} 
            onPress={() => setCommentText("")}
            disabled={!commentText.trim()}
          >
            <Send size={20} color={commentText.trim() ? "#8e44ad" : "#888"} />
          </TouchableOpacity>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.chatBtn}>
            <MessageCircle size={24} color="#8e44ad" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: '#8e44ad' }]}
            onPress={() => setApplying(true)}
          >
            {applying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Ứng tuyển ngay với AI</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// Sub-component for Stats
const StatBox = ({ icon, label, value, isDark, halfWidth }: any) => (
  <View style={[
    styles.statBox, 
    { 
      backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9',
      width: halfWidth ? (width - 44) / 2 : width - 40 // Tự động co giãn
    }
  ]}>
    <View style={styles.statIconInner}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabelText}>{label}</Text>
      <Text 
        style={[styles.statValueText, { color: isDark ? '#FFF' : '#000' }]} 
        numberOfLines={2} // Cho phép xuống dòng tối đa 2 dòng nếu quá dài
      >
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 54 },
  
  headerCenter: {
    position: 'absolute',
    left: 60,
    right: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSmallLogo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center' },

  // Main Info
  mainInfoCard: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 25 },
  mainLogo: { width: 90, height: 90, borderRadius: 24, marginBottom: 16 },
  jobTitleLarge: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12, lineHeight: 32 },
  companyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(142,68,173,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  companyNameText: { color: '#8e44ad', fontWeight: '700', fontSize: 15 },

  // Grid
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0, // Row bên trong sẽ được StatBox marginBottom xử lý
  },
  statBox: { 
    padding: 14, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    // width được set trực tiếp trong component
  },
  statIconInner: { 
    marginRight: 12, 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(150,150,150,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  statLabelText: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: '500' },
  statValueText: { fontSize: 14, fontWeight: '700', lineHeight: 18 },

  // AI Section
  aiSection: { marginHorizontal: 16, marginTop: 10, marginBottom: 20, padding: 18, borderRadius: 20 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiTitle: { fontSize: 16, fontWeight: '800', color: '#8e44ad', marginLeft: 8 },
  aiDescription: { fontSize: 14.5, lineHeight: 22, fontWeight: '500' },

  // Content
  sectionContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeading: { fontSize: 19, fontWeight: '800' },
  bodyText: { fontSize: 16, lineHeight: 26, opacity: 0.85 },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginHorizontal: 20, marginBottom: 24 },

  // Comments
  commentsContainer: { paddingHorizontal: 20 },
  commentCard: { flexDirection: 'row', marginBottom: 20 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  commentContent: { flex: 1, padding: 14, borderRadius: 18, borderTopLeftRadius: 4 },
  commentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { fontWeight: '700', fontSize: 14.5 },
  commentText: { fontSize: 15, lineHeight: 22 },
  commentTimeText: { fontSize: 11, color: '#8E8E93', marginTop: 8, paddingLeft: 2 },

  // Footer
  footerWrapper: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 16, minHeight: 48, marginBottom: 12 },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 10, maxHeight: 100 },
  sendIconBtn: { padding: 8, marginLeft: 4 },
  
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  chatBtn: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(142,68,173,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  primaryBtn: { flex: 1, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#8e44ad', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
});

export default JobDetailScreen;