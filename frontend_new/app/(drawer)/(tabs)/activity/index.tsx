import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface InterviewSession {
  id: string;
  job_id: string | null;
  status: string;
  created_at: string;
  overall_score?: number;
  job_posts: { title: string } | null;
  custom_job_title?: string;
  custom_level?: string;
}

export default function InterviewHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";
  const { user } = useCurrentUser();

  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [userName, setUserName] = useState("Username");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = async (isRefresh = false) => {
    try {
      if (!isRefresh && sessions.length === 0) setLoading(true);
      if (!user) { setLoading(false); setRefreshing(false); return; }

      // Lấy tên từ metadata đã lưu lúc đăng ký
      setUserName(user.user_metadata?.full_name || "Username");

      const { data, error } = await supabase
        .from("interview_sessions")
        .select(
          `id, job_id, status, created_at, overall_score, custom_job_title, custom_level, job_posts ( title )`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSessions((data as any) || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Hàm xử lý khi người dùng kéo xuống
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, []),
  );

  const handleNewChat = () => {
    router.push("/activity/create");
  };

  const renderItem = ({ item }: { item: InterviewSession }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" }]}
      onPress={() =>
        router.push({
          pathname: "/interview/[session_id]",
          params: { session_id: item.id },
        })
      }
    >
      <View
        style={[
          styles.statusLine,
          {
            backgroundColor:
              item.status === "ongoing" ? "#FF9500" : accentColor,
          },
        ]}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text
            style={[styles.jobTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.job_posts?.title ||
              item.custom_job_title ||
              "Phỏng vấn tự do"}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString("vi-VN")}
            </Text>
            <View style={styles.dot} />
            <Text
              style={[
                styles.statusText,
                { color: item.status === "ongoing" ? "#FF9500" : "#8E8E93" },
              ]}
            >
              {item.status === "ongoing" ? "Đang diễn ra" : "Hoàn thành"}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          {item.overall_score != null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={[styles.scoreValue, { color: accentColor }]}>
                {item.overall_score}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#F8F9FA" },
      ]}
    >
      {/* HEADER BLUR XỊN */}
      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? "dark" : "light"}
        style={styles.headerBlur}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>
                XIN CHÀO {userName.toUpperCase()}
              </Text>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Hoạt động
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.miniAddBtn, { backgroundColor: accentColor }]}
              onPress={handleNewChat}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BlurView>

      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
            progressViewOffset={Platform.OS === 'ios' ? 140 : 40} 
          />
        }
        ListHeaderComponent={
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.mainActionCard,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
            ]}
            onPress={handleNewChat}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "rgba(142, 68, 173, 0.1)" },
              ]}
            >
              <Ionicons name="sparkles" size={24} color={accentColor} />
            </View>
            <View style={styles.actionTextContent}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>
                Phỏng vấn mới
              </Text>
              <Text style={styles.actionDesc}>
                Luyện tập kỹ năng cùng AI ngay
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={accentColor} />
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={60}
                color="#D1D1D6"
              />
              <Text style={styles.emptyTitle}>
                Chưa có hoạt động phỏng vấn nào
              </Text>
              <Text style={styles.emptySub}>
                Các buổi phỏng vấn của bạn sẽ xuất hiện tại đây.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 1.2,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  miniAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 140 : 120, // Chừa chỗ cho header blur
    paddingBottom: 40,
  },
  mainActionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
    marginBottom: 30,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextContent: { flex: 1, marginLeft: 15 },
  actionTitle: { fontSize: 18, fontWeight: "700" },
  actionDesc: { fontSize: 13, color: "#8E8E93", marginTop: 2 },

  card: {
    flexDirection: "row",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statusLine: { width: 5 },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  cardLeft: { flex: 1 },
  jobTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 13, color: "#8E8E93" },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D1D6",
    marginHorizontal: 8,
  },
  statusText: { fontSize: 13, fontWeight: "500" },
  cardRight: { flexDirection: "row", alignItems: "center" },
  scoreBadge: { alignItems: "flex-end", marginRight: 12 },
  scoreLabel: {
    fontSize: 10,
    color: "#8E8E93",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  scoreValue: { fontSize: 20, fontWeight: "800" },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8E8E93",
    marginTop: 15,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: "#AEAEB2",
    marginTop: 8,
    textAlign: "center",
  },
});
