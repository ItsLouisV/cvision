import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Briefcase, ArrowLeft, Building2, ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "accepted":
    case "approved":
      return { bg: "#d4edda", text: "#155724", label: "Đã trúng tuyển" };
    case "rejected":
      return { bg: "#f8d7da", text: "#721c24", label: "Từ chối" };
    case "processing":
    case "reviewed":
      return { bg: "#cce5ff", text: "#004085", label: "Đã xem xét" };
    case "pending":
    default:
      return { bg: "#fff3cd", text: "#856404", label: "Đang chờ xử lý" };
  }
};

const AppliedJobsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useCurrentUser();

  const { data: applications = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["applied_jobs", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          created_at,
          status,
          job_id,
          job_posts (
            id,
            title,
            is_active,
            employers (
              company_name,
              company_logo
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.iconCircle, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
        <Briefcase size={40} color={isDark ? "#888" : "#AAA"} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Bạn chưa ứng tuyển công việc nào
      </Text>
      <Text style={styles.emptySub}>
        Khám phá các cơ hội nghề nghiệp mới và nộp CV ngay thôi!
      </Text>
      <TouchableOpacity
        style={styles.discoverBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
      >
        <Text style={styles.discoverText}>Khám phá việc làm</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0" }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bài viết đã ứng tuyển</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8e44ad" />
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            applications.length === 0 && { flex: 1 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#8e44ad"
            />
          }
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => {
            const job = Array.isArray(item.job_posts) ? item.job_posts[0] : item.job_posts;
            if (!job) return null;
            
            const employer = Array.isArray(job.employers) ? job.employers[0] : job.employers;
            const logo = employer?.company_logo;
            const companyName = employer?.company_name || "Công ty ẩn danh";
            const statusStyle = getStatusColor(item.status);

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: isDark ? "#1C1C1E" : "#FFF", borderColor: isDark ? "#2C2C2E" : "#E5E5EA" },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/jobs/${job.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.companyInfo}>
                    {logo ? (
                      <Image source={{ uri: logo }} style={styles.logo} />
                    ) : (
                      <View style={[styles.logo, styles.logoPlaceholder]}>
                        <Building2 size={20} color="#888" />
                      </View>
                    )}
                    <View style={styles.titleWrap}>
                      <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={[styles.companyName, { color: isDark ? "#AAA" : "#666" }]} numberOfLines={1}>
                        {companyName}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Nộp: {formatDate(item.created_at)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {statusStyle.label}
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
};

export default AppliedJobsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 54,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  companyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  logoPlaceholder: {
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(150,150,150,0.2)",
  },
  dateText: {
    fontSize: 13,
    color: "#8E8E93",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
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
  emptySub: {
    textAlign: "center",
    color: "#8E8E93",
    lineHeight: 22,
    marginBottom: 24,
  },
  discoverBtn: {
    backgroundColor: "#8e44ad",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  discoverText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
