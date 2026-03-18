import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FileClock, ShieldCheck } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Interface chuẩn theo dữ liệu thực tế từ Database của Louis
interface AnalysisData {
  overall_score: number;
  personal_info: any;
  education: any;
  experience: any[];
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    suitable_roles: string[];
    improvement_tips: string[];
    suggested_salary: string;
  };
}

interface Job {
  id: string;
  title: string;
  location: string;
  salary_from: number;
  salary_to: number;
  currency?: string;
  salary_unit?: string;
  match_score?: number;
  similarity?: number;
}

export default function CVAnalysisScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [matchingJobs, setMatchingJobs] = useState<Job[]>([]);
  const [cvFileName, setCvFileName] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData(); // fetchData đã có setLoading(true) bên trong nên cần chú ý
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchData = async () => {
    try {
      if (!refreshing && !analysis) setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Lấy dữ liệu CV mới nhất
      const { data: cvData, error } = await supabase
        .from("user_cvs")
        .select("parsed_data, embedding, file_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cvData) {
        if (cvData.file_name) setCvFileName(cvData.file_name);

        // XỬ LÝ LỖI ITERATOR: Parse nếu là string, nếu không giữ nguyên object
        let parsed = cvData.parsed_data;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            console.error("JSON Parse Error", e);
          }
        }
        setAnalysis(parsed);

        // 2. Lấy việc làm gợi ý qua Vector Search (chỉ lấy job >= 75%)
        if (cvData.embedding) {
          const { data: jobs } = await supabase.rpc("match_jobs", {
            query_embedding: cvData.embedding,
            match_threshold: 0.75,
            match_count: 5,
          });
          if (jobs) setMatchingJobs(jobs);
        }
      }
    } catch (e) {
      console.log("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper để render các dòng nội dung an toàn
  const renderItems = (items: any, color: string) => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems.map((item: any, index: number) => (
      <View key={index} style={styles.itemRow}>
        <View style={[styles.bullet, { backgroundColor: color }]} />
        <Text style={[styles.itemText, { color: isDark ? "#CCC" : "#444" }]}>
          {typeof item === "string"
            ? item
            : item.name || item.company || JSON.stringify(item)}
        </Text>
      </View>
    ));
  };

  const formatSalary = (from: number | null, to: number | null, currency: string = "VNĐ", unit: string = "month") => {
  if (!from && !to) return "Thỏa thuận";
  if (unit === "negotiable") return "Thỏa thuận";

  const currencyUpper = currency?.toUpperCase() || "VND";
  const isVND = currencyUpper === "VNĐ" || currencyUpper === "VND";

  // Logic định dạng số:
  // Nếu là VND: Chia cho 1,000,000 để lấy đơn vị "triệu"
  // Nếu là USD/ngoại tệ khác: Dùng toLocaleString() để hiển thị dấu phẩy phân cách (VD: 120,000)
  let fStr = from ? (isVND ? (from / 1000000).toFixed(0) : from.toLocaleString()) : "?";
  let tStr = to ? (isVND ? (to / 1000000).toFixed(0) : to.toLocaleString()) : "?";
  
  // Nối chuỗi tiền tệ
  let salaryText = `${fStr} - ${tStr} ${isVND ? "triệu" : currencyUpper}`;

  // Định dạng đơn vị thời gian
  const unitMap: any = {
    month: "/ tháng",
    year: "/ năm",
    day: "/ ngày",
    project: "/ dự án"
  };

  const unitText = unitMap[unit] || "";
  
  return `${salaryText} ${unitText}`.trim();
};

  const JobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.jobCard,
        { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
      ]}
      onPress={() => router.push(`/jobs/${item.id}`)}
    >
      <View style={styles.jobInfo}>
        <Text
          style={[styles.jobTitleText, { color: theme.text }]}
          numberOfLines={1}
        >
          {item.title || "Software Engineer"}
        </Text>
        <Text style={styles.jobLocation}>{item.location || "Việt Nam"}</Text>
        <Text style={[styles.jobSalary, { color: accentColor }]}>
          {formatSalary(item.salary_from, item.salary_to, item.currency, item.salary_unit)}
        </Text>
      </View>
      <View style={styles.matchBadge}>
        <Text style={styles.matchText}>Hợp</Text>
        <Text style={styles.matchPercent}>
          {Math.round((item.similarity || item.match_score || 0) * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    // Chỉ show màn hình load nếu không phải đang pull-to-refresh
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={{ marginTop: 55, color: "#8E8E93", fontWeight: "600" }}>
          AI đang đọc dữ liệu...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#F8F9FA" },
      ]}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? (isDark ? 50 : 80) : 100}
        tint={isDark ? "dark" : "light"}
        style={styles.headerBlur}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerLabel}>AI SMART ENGINE</Text>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                CV Analysis
              </Text>
            </View>
            <View style={styles.actionRight}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/histories")}
              >
                <FileClock size={24} color={accentColor} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
            progressViewOffset={140}
          />
        }
      >
        {analysis ? (
          <>
            {/* Hiển thị tên file CV đang phân tích */}
            <View style={styles.cvInfoContainer}>
              <View style={styles.cvInfoLabelRow}>
                <Ionicons
                  name="document-attach-outline"
                  size={16}
                  color={accentColor}
                />
                <Text style={styles.cvInfoLabel}>ĐANG PHÂN TÍCH FILE:</Text>
              </View>
              <Text
                style={[styles.cvFileName, { color: theme.text }]}
                numberOfLines={1}
              >
                {cvFileName || "Chưa rõ tên file"}
              </Text>
            </View>

            {/* Điểm tổng quát */}
            <LinearGradient
              colors={["#8e44ad", "#6c5ce7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scoreCard}
            >
              <View>
                <Text style={styles.scoreLabel}>Độ mạnh CV</Text>
                <Text style={styles.scoreValue}>
                  {analysis.overall_score || 0}/100
                </Text>
              </View>
              <Ionicons name="rocket" size={50} color="rgba(255,255,255,0.4)" />
            </LinearGradient>

            {/* Việc làm gợi ý */}
            <View style={styles.matchingSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.listHeaderTitle, { color: theme.text }]}>
                  Việc làm gợi ý từ AI
                </Text>
                <Ionicons name="sparkles" size={18} color={accentColor} />
              </View>
              {matchingJobs.length > 0 ? (
                matchingJobs.map((job) => <JobCard key={job.id} item={job} />)
              ) : (
                <Text style={styles.emptyJobs}>
                  Đang tìm kiếm job phù hợp nhất...
                </Text>
              )}
            </View>

            {/* Điểm mạnh */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: "rgba(52, 199, 89, 0.1)" },
                  ]}
                >
                  <ShieldCheck size={20} color="#32D74B" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Điểm mạnh nổi bật
                </Text>
              </View>
              {renderItems(analysis.strengths, "#32D74B")}
            </View>

            {/* Điểm yếu / Cần cải thiện */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: "rgba(255, 149, 0, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="trending-up-outline"
                    size={20}
                    color="#FF9500"
                  />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Lộ trình cải thiện
                </Text>
              </View>
              {renderItems(
                analysis.recommendations?.improvement_tips ||
                  analysis.weaknesses,
                "#FF9500",
              )}
            </View>

            {/* Vị trí phù hợp */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: "rgba(10, 132, 255, 0.1)" },
                  ]}
                >
                  <Ionicons name="bulb-outline" size={20} color="#0A84FF" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Vị trí AI gợi ý
                </Text>
              </View>
              {renderItems(analysis.recommendations?.suitable_roles, "#0A84FF")}
            </View>

            <TouchableOpacity
              style={styles.reUploadBtn}
              onPress={() => router.push("/(tabs)/analysis/upload")}
            >
              <Text style={styles.reUploadText}>Phân tích CV khác</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={80} color="#D1D1D6" />
            <Text style={styles.emptyTitle}>Chưa có dữ liệu phân tích</Text>
            <Text style={styles.emptySub}>
              Hãy tải lên CV của bạn, AI của Louis sẽ giúp bạn tìm ra điểm mạnh
              nhất!
            </Text>
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: accentColor }]}
              onPress={() => router.push("/(tabs)/analysis/upload")}
            >
              <Text style={styles.mainBtnText}>Tải CV ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  headerBlur: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  actionRight: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: { flexDirection: "row", gap: 10 },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(142, 68, 173, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8e44ad",
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 28, fontWeight: "900" },
  cvInfoContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  cvInfoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cvInfoLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8e44ad",
    letterSpacing: 0.5,
  },
  cvFileName: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.8,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 140, paddingBottom: 60 },

  scoreCard: {
    padding: 24,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
    shadowColor: "#8e44ad",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "700",
  },
  scoreValue: { color: "#fff", fontSize: 42, fontWeight: "900" },

  matchingSection: { marginBottom: 30 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 8,
  },
  listHeaderTitle: { fontSize: 20, fontWeight: "800" },

  jobCard: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  jobInfo: { flex: 1 },
  jobTitleText: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  jobLocation: { fontSize: 13, color: "#8E8E93", marginBottom: 6 },
  jobSalary: { fontSize: 14, fontWeight: "700" },
  matchBadge: {
    alignItems: "center",
    backgroundColor: "rgba(142, 68, 173, 0.08)",
    padding: 12,
    borderRadius: 16,
  },
  matchText: {
    fontSize: 10,
    color: "#8e44ad",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  matchPercent: { fontSize: 18, color: "#8e44ad", fontWeight: "900" },
  emptyJobs: {
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },

  sectionCard: {
    padding: 22,
    borderRadius: 26,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  itemRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  itemText: { fontSize: 15, lineHeight: 22, flex: 1, fontWeight: "500" },

  reUploadBtn: { padding: 20, alignItems: "center", marginTop: 10 },
  reUploadText: { color: "#8e44ad", fontWeight: "800", fontSize: 16 },

  emptyState: { alignItems: "center", marginTop: 80 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3A3A3C",
    marginTop: 24,
  },
  emptySub: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 12,
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  mainBtn: {
    marginTop: 35,
    paddingHorizontal: 45,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: "#8e44ad",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  mainBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
});
