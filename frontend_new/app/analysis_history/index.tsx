// app/analysis_history/index.tsx

import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck, Target, Zap, Briefcase } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

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

export default function AnalysisHistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [cvFileName, setCvFileName] = useState<string>("");

  useEffect(() => {
    if (id) {
      fetchAnalysisDetails();
    }
  }, [id]);

  const fetchAnalysisDetails = async () => {
    try {
      setLoading(true);
      const { data: cvData, error } = await supabase
        .from("user_cvs")
        .select("parsed_data, file_name")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (cvData) {
        setCvFileName(cvData.file_name || "CV_Phan_Tich.pdf");

        let parsed = cvData.parsed_data;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            console.error("JSON Parse Error", e);
          }
        }
        setAnalysis(parsed);
      }
    } catch (e) {
      console.log("Error fetching detail data:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderItems = (items: any, color: string) => {
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0) return <Text style={[styles.emptyItemText, {color: isDark ? '#666' : '#999'}]}>Không có dữ liệu hiển thị.</Text>;
    
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={{ marginTop: 10, color: theme.text, opacity: 0.6 }}>Đang đọc dữ liệu...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#000" : "#F8F9FA" }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* --- CUSTOM HEADER --- */}
      <View style={[styles.header, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Kết quả phân tích</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{cvFileName}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="share-outline" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!analysis ? (
             <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color="#8E8E93" />
                <Text style={{ marginTop: 15, color: theme.text, fontWeight: "600" }}>
                Không tìm thấy dữ liệu.
                </Text>
            </View>
        ) : (
          <>
            {/* SCORE CARD */}
            <LinearGradient
              colors={["#8e44ad", "#6c5ce7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scoreCard}
            >
              <View>
                <Text style={styles.scoreLabel}>Chỉ số chuyên nghiệp</Text>
                <View style={styles.scoreValueRow}>
                    <Text style={styles.scoreValue}>{analysis.overall_score || 0}</Text>
                    <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>
              <View style={styles.scoreBadge}>
                 <Zap size={30} color="#FFD60A" fill="#FFD60A" />
              </View>
            </LinearGradient>

            {/* SECTION: STRENGTHS */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(52, 199, 89, 0.1)" }]}>
                  <ShieldCheck size={22} color="#32D74B" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Điểm mạnh nổi bật</Text>
              </View>
              {renderItems(analysis.strengths, "#32D74B")}
            </View>

            {/* SECTION: IMPROVEMENTS */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(255, 149, 0, 0.1)" }]}>
                  <Target size={22} color="#FF9500" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Cần cải thiện</Text>
              </View>
              {renderItems(
                analysis.recommendations?.improvement_tips || analysis.weaknesses,
                "#FF9500"
              )}
            </View>

            {/* SECTION: ROLES */}
            <View style={[styles.sectionCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: "rgba(10, 132, 255, 0.1)" }]}>
                  <Briefcase size={22} color="#0A84FF" />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Vị trí phù hợp</Text>
              </View>
              <View style={styles.rolesContainer}>
                {analysis.recommendations?.suitable_roles?.map((role, idx) => (
                    <View key={idx} style={[styles.roleBadge, {backgroundColor: isDark ? '#2C2C2E' : '#F0F7FF'}]}>
                        <Text style={[styles.roleText, {color: '#0A84FF'}]}>{role}</Text>
                    </View>
                ))}
              </View>
            </View>

            {/* BACK BUTTON */}
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: accentColor }]}
              onPress={() => router.back()}
            >
              <Text style={styles.mainBtnText}>Hoàn tất xem</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  
  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    height: 60,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
    fontWeight: "500",
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  
  // Score Card
  scoreCard: {
    padding: 24,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: { color: "#fff", fontSize: 48, fontWeight: "900" },
  scoreMax: { color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: "600", marginLeft: 4 },
  scoreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Cards
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  
  // List Items
  itemRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  itemText: { flex: 1, fontSize: 14, lineHeight: 20 },
  emptyItemText: { fontSize: 13, fontStyle: 'italic' },

  // Roles Badge
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Button
  mainBtn: {
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#8e44ad",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  mainBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});