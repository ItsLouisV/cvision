import React, { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Briefcase,
  ChevronLeft,
  CircleDollarSign,
  MapPin,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  Edit3,
  Timer,
} from "lucide-react-native";
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get("window");

const ExpiredJobScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [extending, setExtending] = useState(false);

  const fetchJobDetail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("job_posts")
        .select(`*, employers (company_name, company_logo, is_verified)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchJobDetail();
    }, [id])
  );

//   const fetchJobDetail = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("job_posts")
//         .select(`*, employers (company_name, company_logo, is_verified)`)
//         .eq("id", id)
//         .single();
//       if (error) throw error;
//       setJob(data);
//     } catch (error) {
//       console.error("Error:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

  const getTimeRemaining = (expiryDate: string) => {
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    if (diff <= 0) return "0 phút";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} giờ ${minutes} phút`;
  };

  const getStatusConfig = () => {
    if (!job) return null;
    const now = new Date();
    const expiry = new Date(job.expired_at);
    const diffInMs = expiry.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    // 1. ĐÃ HẾT HẠN (Đỏ) -> HIỆN NÚT GIA HẠN
    if (diffInMs <= 0) {
      return {
        type: 'expired',
        bgColor: isDark ? '#2a1212' : '#FFF5F5',
        borderColor: '#feb2b2',
        icon: <AlertTriangle color="#e74c3c" size={24} />,
        title: 'Trạng thái: Đã đóng',
        titleColor: '#e74c3c',
        desc: `Đã hết hạn vào ${expiry.toLocaleString('vi-VN')}`,
        btnColor: '#8e44ad',
        btnText: 'Gia hạn & Đăng lại ngay',
        showFooter: true
      };
    }

    // 2. SẮP HẾT HẠN - Dưới 6 tiếng (Vàng) -> HIỆN NÚT GIA HẠN
    if (diffInHours <= 6) {
      return {
        type: 'warning',
        bgColor: isDark ? '#2a2111' : '#FFFBEB',
        borderColor: '#fef3c7',
        icon: <Timer color="#d97706" size={24} />,
        title: 'Sắp hết hạn!',
        titleColor: '#d97706',
        desc: `Chỉ còn ${getTimeRemaining(job.expired_at)} để nhận hồ sơ.`,
        btnColor: '#f39c12',
        btnText: 'Gia hạn thêm 14 ngày',
        showFooter: true
      };
    }

    // 3. ĐANG HOẠT ĐỘNG (Xanh) -> ẨN NÚT GIA HẠN
    return {
      type: 'active',
      bgColor: isDark ? '#0f1c15' : '#F0FFF4',
      borderColor: '#9ae6b4',
      icon: <CheckCircle2 color="#2f855a" size={24} />,
      title: 'Đang hoạt động',
      titleColor: '#2f855a',
      desc: `Bài viết còn tồn tại trong ${getTimeRemaining(job.expired_at)}`,
      showFooter: false // Không hiển thị footer khi còn xanh
    };
  };

  const handleExtend = async () => {
    setExtending(true);
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 14);

      const { error } = await supabase
        .from('job_posts')
        .update({ 
          expired_at: newExpiry.toISOString(),
          is_active: true,
          warning_sent: false 
        })
        .eq('id', id);

      if (error) throw error;
      Alert.alert("Thành công", "Bài viết đã được gia hạn thêm 14 ngày!");
      fetchJobDetail(); 
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gia hạn.");
    } finally {
      setExtending(false);
    }
  };

  const status = getStatusConfig();

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8e44ad" /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* --- HEADER --- */}
      <View style={[styles.headerContainer, { paddingTop: insets.top, height: insets.top + 54 }]}>
         <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
         <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>Chi tiết bài đăng</Text>
          
          <TouchableOpacity 
            onPress={() => router.push(`/employer/edit-job?id=${id}`)} 
            style={styles.circleBtn}
          >
            <Edit3 size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ 
          paddingTop: insets.top + 70, 
          paddingBottom: status?.showFooter ? 120 : 40 // Nếu không có footer thì bớt padding lại
        }}
      >
        
        {/* --- DYNAMIC STATUS BANNER --- */}
        {status && (
          <View style={[styles.statusBanner, { backgroundColor: status.bgColor, borderColor: status.borderColor }]}>
            {status.icon}
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.statusTitle, { color: status.titleColor }]}>{status.title}</Text>
              <Text style={[styles.statusDesc, { color: isDark ? '#ccc' : '#666' }]}>{status.desc}</Text>
            </View>
          </View>
        )}

        {/* --- MAIN INFO --- */}
        <View style={styles.mainInfoCard}>
          <Image source={{ uri: job?.employers?.company_logo }} style={styles.mainLogo} />
          <Text style={[styles.jobTitleLarge, { color: theme.text }]}>{job?.title}</Text>
          <View style={styles.companyBadge}>
            <Text style={styles.companyNameText}>{job?.employers?.company_name}</Text>
            {job?.employers?.is_verified && <CheckCircle2 size={14} color="#8e44ad" style={{ marginLeft: 4 }} />}
          </View>
        </View>

        {/* --- JOB STATS --- */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatBox icon={<Briefcase size={20} color="#8e44ad" />} label="Hình thức" value={job.job_type} isDark={isDark} halfWidth />
            <StatBox icon={<Users size={20} color="#3498db" />} label="Ứng tuyển" value="12 hồ sơ" isDark={isDark} halfWidth />
          </View>
          <StatBox icon={<MapPin size={20} color="#e74c3c" />} label="Địa điểm" value={job.location} isDark={isDark} />
          <StatBox icon={<CircleDollarSign size={20} color="#27ae60" />} label="Mức lương" value={`${job.salary_from/1000000}Tr - ${job.salary_to/1000000}Tr`} isDark={isDark} />
        </View>

        {/* --- DESCRIPTION --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color={theme.text} />
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Mô tả chi tiết</Text>
          </View>
          <Text style={[styles.bodyText, { color: theme.text }]}>{job.description}</Text>
        </View>

        {/* --- REQUIREMENTS --- */}
        {job.requirements && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <CheckCircle2 size={20} color={theme.text} />
              <Text style={[styles.sectionHeading, { color: theme.text }]}>Yêu cầu</Text>
            </View>
            <Text style={[styles.bodyText, { color: theme.text }]}>{job.requirements}</Text>
          </View>
        )}
      </ScrollView>

      {/* --- FOOTER: CHỈ HIỂN THỊ KHI SẮP HẾT HẠN HOẶC ĐÃ HẾT HẠN --- */}
      {status?.showFooter && (
        <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: isDark ? '#333' : '#EEE', paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: status?.btnColor || '#8e44ad' }]} 
            onPress={handleExtend}
            disabled={extending}
          >
            {extending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <RefreshCw size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>{status?.btnText}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const StatBox = ({ icon, label, value, isDark, halfWidth }: any) => (
  <View style={[styles.statBox, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9F9', width: halfWidth ? (width - 50) / 2 : width - 40 }]}>
    <View style={styles.statIconInner}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabelText}>{label}</Text>
      <Text style={[styles.statValueText, { color: isDark ? '#FFF' : '#000' }]} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 54 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center' },
  statusBanner: { margin: 20, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  statusTitle: { fontWeight: '800', fontSize: 16, marginBottom: 2 },
  statusDesc: { fontSize: 13 },
  mainInfoCard: { alignItems: 'center', marginBottom: 25 },
  mainLogo: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, resizeMode: 'contain', backgroundColor: '#4b4a4aff' },
  jobTitleLarge: { fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 20 },
  companyBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  companyNameText: { color: '#8e44ad', fontWeight: '600' },
  statsContainer: { paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statIconInner: { marginRight: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(150,150,150,0.05)', justifyContent: 'center', alignItems: 'center' },
  statLabelText: { fontSize: 11, color: '#888' },
  statValueText: { fontSize: 13, fontWeight: '700' },
  sectionContainer: { paddingHorizontal: 20, marginTop: 10, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionHeading: { fontSize: 17, fontWeight: '800', marginLeft: 8 },
  bodyText: { fontSize: 15, lineHeight: 24, opacity: 0.7 },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 16, borderTopWidth: 1 },
  primaryBtn: { width: '100%', height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});

export default ExpiredJobScreen;