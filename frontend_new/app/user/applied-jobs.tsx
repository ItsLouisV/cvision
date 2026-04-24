import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  MapPin,
  CircleDollarSign,
  Clock,
  Calendar,
  CheckCircle2,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatSalary, formatTime } from "@/utils/formatters";
import { LinearGradient } from "expo-linear-gradient";
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
      return { bg: "#9ef5cf", text: "#067d5e", label: "Đã duyệt", icon: "check-circle" };
    case "rejected":
      return { bg: "#f1b0b0", text: "#c12222", label: "Bị từ chối", icon: "x-circle" };
    case "processing":
    case "reviewed":
      return { bg: "#E1EFFE", text: "#1E429F", label: "Đã xem xét", icon: "eye" };
    case "pending":
    default:
      return { bg: "#f0e0a1", text: "#ad5118", label: "Đang chờ xử lý", icon: "clock" };
  }
};

const AppliedJobsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useCurrentUser();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const statuses = [
    { id: "all", label: "Tất cả" },
    { id: "pending", label: "Đang chờ" },
    { id: "accepted", label: "Đã duyệt" },
    { id: "reviewed", label: "Đã xem xét" },
    { id: "rejected", label: "Từ chối" },
  ];

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
            salary_from,
            salary_to,
            currency,
            salary_unit,
            location,
            job_type,
            category,
            created_at,
            employers (
              company_name,
              company_logo,
              is_verified
            ),
            user_profiles (
              id,
              full_name,
              avatar_url
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

  const filteredApplications = applications.filter((app: any) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "reviewed") return app.status === "reviewed" || app.status === "processing";
    return app.status === selectedStatus;
  });

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a: any) => a.status === "pending").length,
    accepted: applications.filter((a: any) => a.status === "accepted" || a.status === "approved").length,
    reviewed: applications.filter((a: any) => a.status === "reviewed" || a.status === "processing").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
  };

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

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {statuses.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.filterTab,
                selectedStatus === s.id && styles.filterTabActive,
                { borderColor: isDark ? "#2C2C2E" : "#E5E5EA" }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedStatus(s.id);
              }}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: selectedStatus === s.id ? "#FFF" : (isDark ? "#AAA" : "#666") }
                ]}
              >
                {s.label} ({statusCounts[s.id as keyof typeof statusCounts]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8e44ad" />
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
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
            const recruiter = Array.isArray(job.user_profiles) ? job.user_profiles[0] : job.user_profiles;
            
            const recruiterAvatar = recruiter?.avatar_url || 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(recruiter?.full_name || employer?.company_name || "U")}&background=8e44ad&color=fff`;
            
            const companyLogo = employer?.company_logo;
            const companyName = employer?.company_name || "Công ty ẩn danh";
            const statusStyle = getStatusColor(item.status);
            
            const salary = formatSalary(
              job.salary_from,
              job.salary_to,
              job.currency,
              job.salary_unit
            );

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: isDark ? "#1C1C1E" : "#FFF", borderColor: isDark ? "#2C2C2E" : "#F2F2F7" },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/jobs/${job.id}`);
                }}
                activeOpacity={0.9}
              >
                <View style={styles.cardTop}>
                  <View style={styles.recruiterSection}>
                    <Image source={{ uri: recruiterAvatar }} style={styles.recruiterAvatar} />
                    {companyLogo && (
                      <View style={styles.miniLogoContainer}>
                        <Image source={{ uri: companyLogo }} style={styles.miniLogo} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.mainInfo}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.jobTitle, { color: theme.text }]} numberOfLines={1}>
                        {job.title}
                      </Text>
                      {employer?.is_verified && (
                        <CheckCircle2 size={14} color="#00BAFF" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={[styles.companyNameText, { color: isDark ? "#AAA" : "#666" }]} numberOfLines={1}>
                      {companyName} • {recruiter?.full_name || "Nhà tuyển dụng"}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color={isDark ? "#888" : "#666"} />
                    <Text style={[styles.detailText, { color: isDark ? "#AAA" : "#666" }]} numberOfLines={1}>
                      {job.location || "Toàn quốc"}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <CircleDollarSign size={14} color={isDark ? "#888" : "#666"} />
                    <Text style={[styles.detailText, { color: isDark ? "#AAA" : "#666" }]}>
                      {salary}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={isDark ? "#888" : "#666"} />
                    <Text style={[styles.detailText, { color: isDark ? "#AAA" : "#666" }]}>
                      {job.job_type || "Toàn thời gian"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <Calendar size={12} color="#8E8E93" />
                    <Text style={styles.dateText}>
                      Đã nộp {formatTime(item.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewDetailBtn}
                    onPress={() => router.push(`/jobs/${job.id}`)}
                  >
                    <Text style={styles.viewDetailText}>Chi tiết</Text>
                  </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  recruiterSection: {
    position: "relative",
    marginRight: 12,
  },
  recruiterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F7",
  },
  miniLogoContainer: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFF",
    borderRadius: 6,
    padding: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  miniLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  mainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    maxWidth: "90%",
  },
  companyNameText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(150,150,150,0.1)",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  viewDetailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(142, 68, 173, 0.1)",
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8e44ad",
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
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  emptySub: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  discoverBtn: {
    backgroundColor: "#8e44ad",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: "#8e44ad",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  discoverText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
  filterContainer: {
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  filterTabActive: {
    backgroundColor: "#8e44ad",
    borderColor: "#8e44ad",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
