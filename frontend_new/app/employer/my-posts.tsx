import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ChevronLeft, Briefcase, MapPin, CircleDollarSign, Clock } from "lucide-react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dayjs from "dayjs";

export default function MyPostsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useCurrentUser();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyPosts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("job_posts")
        .select(`*, employers (company_name, company_logo, is_verified)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyPosts();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyPosts();
  };

  const getStatus = (expiredAt: string) => {
    const isExpired = new Date(expiredAt).getTime() < new Date().getTime();
    if (isExpired) {
      return { label: "Đã hết hạn", color: "#e74c3c", bgColor: isDark ? "#2a1212" : "#FFF5F5" };
    }
    return { label: "Đang hoạt động", color: "#2f855a", bgColor: isDark ? "#0f1c15" : "#F0FFF4" };
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.iconCircle, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
        <Briefcase size={40} color={isDark ? "#888" : "#AAA"} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Chưa có bài viết nào
      </Text>
      <Text style={styles.emptySub}>
        Bạn chưa đăng tải bài tuyển dụng nào.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? "#121212" : "#ebedf0" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Quản lý bài viết
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8e44ad" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, posts.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8e44ad"
            />
          }
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => {
            const status = getStatus(item.expired_at);
            const employer = item.employers || {};

            return (
              <TouchableOpacity
                onPress={() => router.push(`/employer/expired-job?id=${item.id}`)}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? "#0d0d0e" : "#FFF",
                    borderColor: isDark ? "#2C2C2E" : "#E5E5EA",
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Image
                    source={{ uri: employer.company_logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(employer.company_name || 'C')}&background=8e44ad&color=fff` }}
                    style={styles.logo}
                  />
                  <View style={styles.jobInfo}>
                    <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.companyName} numberOfLines={1}>
                      {employer.company_name || "Công ty chưa cập nhật"}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsRow}>
                    <MapPin size={14} color="#8E8E93" style={styles.detailIcon} />
                    <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
                </View>

                <View style={styles.detailsRow}>
                    <CircleDollarSign size={14} color="#8E8E93" style={styles.detailIcon} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {item.salary_from && item.salary_to 
                        ? `${item.salary_from/1000000}Tr - ${item.salary_to/1000000}Tr`
                        : "Thỏa thuận"}
                    </Text>
                  </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#8E8E93" style={styles.detailIcon} />
                    <Text style={styles.detailText}>
                      Tạo ngày: {dayjs(item.created_at).format("DD/MM/YYYY")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 54,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  logo: { width: 44, height: 44, borderRadius: 28, marginRight: 12 },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  companyName: { fontSize: 13, color: "#8E8E93" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 12, opacity: 0.5 },
  detailsRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  detailItem: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  detailIcon: { marginRight: 6 },
  detailText: { fontSize: 13, color: "#8E8E93" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    minHeight: 400,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  emptySub: { textAlign: "center", color: "#8E8E93", lineHeight: 22 },
});
