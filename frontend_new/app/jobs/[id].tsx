import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const JobDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("job_posts")
        .select(
          `
          *,
          employers (
            company_name,
            company_logo,
            is_verified
          )
        `,
        )
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

  const formatSalary = (from: number | null, to: number | null) => {
    if (!from && !to) return "Thỏa thuận";
    const f = from ? (from / 1000000).toFixed(0) : "0";
    const t = to ? (to / 1000000).toFixed(0) : "0";
    return `${f} - ${t} tr`;
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>
          Không tìm thấy thông tin công việc.
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 20,
            padding: 10,
            backgroundColor: "#8e44ad",
            borderRadius: 8,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* CUSTOM HEADER CAO CẤP */}
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: theme.background }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
          >
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.headerBtn}>
            <Share2 size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TITLE & HEADER CÔNG VIỆC CHUẨN UX MỚI */}
        <View style={styles.jobHeader}>
          <View style={styles.companyRowAligned}>
            <Image
              source={{
                uri:
                  job.employers?.company_logo ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(job.employers?.company_name || "HR")}&background=8e44ad&color=fff`,
              }}
              style={styles.logoSmall}
            />
            <View style={styles.companyInfoText}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={[
                    styles.companyName,
                    { color: isDark ? "#D4B0FF" : "#6A1B9A" },
                  ]}
                  numberOfLines={1}
                >
                  {job.employers?.company_name}
                </Text>
                {job.employers?.is_verified && (
                  <CheckCircle2
                    size={16}
                    color="#8e44ad"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              {job.category && (
                <Text style={styles.categoryText}>{job.category}</Text>
              )}
            </View>
          </View>

          <Text style={[styles.jobTitle, { color: theme.text }]}>
            {job.title}
          </Text>
        </View>

        {/* LƯỚI THÔNG SỐ (GRID) */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statBoxModern,
              { backgroundColor: isDark ? "#1C1C1E" : "#F8F9FB" },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: isDark ? "#2C2C2E" : "#EAE4F2" },
              ]}
            >
              <CircleDollarSign size={20} color="#8e44ad" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Mức lương</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatSalary(job.salary_from, job.salary_to)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statBoxModern,
              { backgroundColor: isDark ? "#1C1C1E" : "#F8F9FB" },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: isDark ? "#2C2C2E" : "#DFEBF3" },
              ]}
            >
              <MapPin size={20} color="#0088CC" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Địa điểm</Text>
              <Text
                style={[styles.statValue, { color: theme.text }]}
                numberOfLines={1}
              >
                {job.location || "Toàn quốc"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statBoxModern,
              { backgroundColor: isDark ? "#1C1C1E" : "#F8F9FB" },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: isDark ? "#2C2C2E" : "#FBEFE4" },
              ]}
            >
              <Briefcase size={20} color="#E67E22" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Hình thức</Text>
              <Text
                style={[styles.statValue, { color: theme.text }]}
                numberOfLines={1}
              >
                {getJobTypeLabel(job.job_type)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statBoxModern,
              { backgroundColor: isDark ? "#1C1C1E" : "#F8F9FB" },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: isDark ? "#2C2C2E" : "#E6F4EA" },
              ]}
            >
              <Calendar size={20} color="#27AE60" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Hạn nộp</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatDate(job.expired_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* LOUIS AI INSIGHT CARD */}
        <View
          style={[
            styles.aiCard,
            { backgroundColor: isDark ? "#2D1B4D" : "#F3E8FF" },
          ]}
        >
          <View style={styles.aiHeader}>
            <Sparkles size={20} color="#8e44ad" />
            <Text style={styles.aiTitle}>Louis AI Assessor</Text>
          </View>
          <Text
            style={[styles.aiText, { color: isDark ? "#D4B0FF" : "#6A1B9A" }]}
          >
            Hệ thống trí tuệ nhân tạo sẽ đối chiếu tự động hồ sơ CV của bạn. Chỉ
            những hồ sơ đạt **Mức độ phù hợp &gt; 70%** mới có khả năng kết nối
            cao nhất.
          </Text>
        </View>

        {/* NỘI DUNG CHI TIẾT */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeaderRow}>
            <Building2 size={20} color={theme.text} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Mô tả công việc
            </Text>
          </View>
          <Text style={[styles.description, { color: theme.text }]}>
            {job.description}
          </Text>
        </View>

        {job.requirements && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeaderRow}>
              <CheckCircle2 size={20} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Yêu cầu ứng viên
              </Text>
            </View>
            <Text style={[styles.description, { color: theme.text }]}>
              {job.requirements}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: isDark ? "#333" : "#E5E5EA",
          },
        ]}
      >
        <TouchableOpacity style={styles.chatBtn}>
          <MessageCircle size={24} color="#8e44ad" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: "#8e44ad" }]}
          onPress={() => setApplying(true)}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>Ứng tuyển ngay với AI</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 54,
    alignItems: "center",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(150,150,150,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  jobHeader: { marginBottom: 24 },
  companyRowAligned: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoSmall: { width: 60, height: 60, borderRadius: 16, marginRight: 16 },
  companyInfoText: { flex: 1, justifyContent: "center" },
  companyName: { fontSize: 17, fontWeight: "700" },
  categoryText: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
  jobTitle: { fontSize: 24, fontWeight: "800", lineHeight: 32 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statBoxModern: {
    width: (width - 55) / 2,
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statTextContainer: { flex: 1 },
  statLabel: {
    fontSize: 11,
    color: "#8E8E93",
    marginBottom: 4,
    fontWeight: "500",
  },
  statValue: { fontSize: 13, fontWeight: "700" },

  aiCard: { padding: 18, borderRadius: 20, marginBottom: 25 },
  aiHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  aiTitle: { marginLeft: 8, fontWeight: "800", color: "#8e44ad", fontSize: 16 },
  aiText: { fontSize: 13.5, lineHeight: 22, fontWeight: "500" },

  contentSection: { marginBottom: 30 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800", marginLeft: 10 },
  description: { fontSize: 16, lineHeight: 26, opacity: 0.85 },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === "ios" ? 35 : 20,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  chatBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(142, 68, 173, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  applyBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8e44ad",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default JobDetailScreen;
