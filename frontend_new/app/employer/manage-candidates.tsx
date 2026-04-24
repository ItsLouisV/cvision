import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import dayjs from 'dayjs'

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
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Users,
  Check,
  X,
  FileText,
  Download,
  ChevronLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { CVPreviewModal } from "@/components/CVPreviewModal";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(months / 12);
  return `${years} năm trước`;
};

export default function ManageCandidatesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const { user } = useCurrentUser();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const statuses = [
    { id: "all", label: "Tất cả", count: 0 },
    { id: "pending", label: "Chờ duyệt", count: 0 },
    { id: "accepted", label: "Đã nhận", count: 0 },
    { id: "rejected", label: "Từ chối", count: 0 },
  ];

  const {
    data: applications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["manage_candidates", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // console.log("--- START DEBUGGING ---");
      // console.log("1. UID Đăng nhập:", user.id);

      // --- BẢNG 1: JOB_POSTS ---
      const { data: myJobs, error: e1 } = await supabase
        .from("job_posts")
        .select("id, title, user_id")
        .eq("user_id", user.id);

      // console.log("2. Bảng JOB_POSTS:", {
      //   count: myJobs?.length || 0,
      //   data: myJobs,
      //   error: e1
      // });

      if (!myJobs || myJobs.length === 0) return [];
      const myJobIds = myJobs.map((j) => j.id);

      // --- BẢNG 2: APPLICATIONS ---
      const { data: rawApps, error: e2 } = await supabase
        .from("applications")
        .select("*")
        .in("job_id", myJobIds);

      // console.log("3. Bảng APPLICATIONS:", {
      //   count: rawApps?.length || 0,
      //   data: rawApps,
      //   error: e2
      // });

      if (!rawApps || rawApps.length === 0) return [];

      // Thu thập ID để fetch tiếp
      const applicantIds = [...new Set(rawApps.map((a) => a.user_id))];
      const cvIds = [...new Set(rawApps.map((a) => a.cv_id).filter(Boolean))];

      // --- BẢNG 3: USER_PROFILES ---
      const { data: profiles, error: e3 } = await supabase
        .from("user_profiles")
        .select("id, full_name, avatar_url")
        .in("id", applicantIds);

      // console.log("4. Bảng USER_PROFILES:", {
      //   ids_can_tim: applicantIds,
      //   count: profiles?.length || 0,
      //   data: profiles,
      //   error: e3
      // });

      // --- BẢNG 4: USER_CVS ---
      const { data: cvs, error: e4 } = await supabase
        .from("user_cvs")
        .select("id, file_name, file_url")
        .in("id", cvIds);

      // console.log("5. Bảng USER_CVS:", {
      //   ids_can_tim: cvIds,
      //   count: cvs?.length || 0,
      //   data: cvs,
      //   error: e4
      // });

      // --- GỘP DỮ LIỆU ---
      const profileMap = Object.fromEntries(
        profiles?.map((p) => [p.id, p]) || [],
      );
      const cvMap = Object.fromEntries(cvs?.map((c) => [c.id, c]) || []);
      const jobMap = Object.fromEntries(myJobs.map((j) => [j.id, j]));

      const merged = rawApps.map((app) => ({
        ...app,
        user_profiles: profileMap[app.user_id] || null,
        user_cvs: cvMap[app.cv_id] || null,
        job_posts: jobMap[app.job_id] || null,
      }));

      // console.log("6. KẾT QUẢ CUỐI CÙNG (Gộp):", merged[0]); // Log thử dòng đầu tiên
      // console.log("--- END DEBUGGING ---");

      return merged;
    },
    enabled: !!user,
  });

  const filteredApplications = applications.filter((app: any) => 
    selectedStatus === "all" ? true : app.status === selectedStatus
  );

  // Tính toán số lượng cho từng status
  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a: any) => a.status === "pending").length,
    accepted: applications.filter((a: any) => a.status === "accepted").length,
    rejected: applications.filter((a: any) => a.status === "rejected").length,
  };

  const handleUpdateStatus = async (
    appId: string,
    newStatus: string,
    candidateId: string,
    jobTitle: string,
  ) => {
    Alert.alert(
      "Xác nhận",
      newStatus === "accepted"
        ? "Duyệt hồ sơ ứng viên này?"
        : "Từ chối hồ sơ ứng viên này?",
      [
        { text: "Bỏ qua", style: "cancel" },
        {
          text: "Đồng ý",
          style: newStatus === "accepted" ? "default" : "destructive",
          onPress: async () => {
            setUpdatingId(appId);
            try {
              const { error } = await supabase
                .from("applications")
                .update({ status: newStatus })
                .eq("id", appId);

              if (error) throw error;

              // Gửi thông báo tới ứng viên
              const title =
                newStatus === "accepted"
                  ? "Hồ sơ được chấp nhận! 🎉"
                  : "Cập nhật trạng thái hồ sơ";
              const content =
                newStatus === "accepted"
                  ? `Chúc mừng! Hồ sơ ứng tuyển của bạn cho vị trí ${jobTitle} đã được nhà tuyển dụng xem xét. Chúc bạn sớm được gọi phỏng vấn.`
                  : `Hồ sơ ứng tuyển vị trí ${jobTitle} của bạn đã được xem xét và có vẻ như chưa phù hợp với yêu cầu của nhà tuyển dụng. Chúc bạn may mắn lần sau.`;

              await supabase.from("notifications").insert([
                {
                  user_id: candidateId,
                  title,
                  content,
                  data: { type: "application_status", application_id: appId },
                  type: "application_status",
                },
              ]);

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Toast.show({
                type: "success",
                text1: "Thành công",
                text2: `Đã ${newStatus === "accepted" ? "nhận" : "từ chối"} hồ sơ ứng viên.`,
              });
              queryClient.invalidateQueries({
                queryKey: ["manage_candidates"],
              });
              refetch();
            } catch (err: any) {
              console.error(err);
              Toast.show({
                type: "error",
                text1: "Lỗi",
                text2: err.message || "Không thể cập nhật hồ sơ lúc này.",
              });
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const handleDownloadCV = async (fileUrl: string, fileName: string) => {
    // @ts-ignore - Khai báo biến đường dẫn trước để dùng trong finally
    let fileUri = "";
    const safeFileName = fileName
      ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
      : `CV_${Date.now()}.pdf`;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({ type: "info", text1: "Đang chuẩn bị tệp..." });

      // @ts-ignore
      fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          console.log(`Tiến độ: ${(progress * 100).toFixed(2)}%`);
        },
      );

      const downloadResult = await downloadResumable.downloadAsync();

      if (downloadResult && downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          // Lệnh shareAsync sẽ đợi cho đến khi người dùng đóng hộp thoại chia sẻ
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: "application/pdf",
            dialogTitle: "Lưu CV về máy",
            UTI: "com.adobe.pdf",
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Thiết bị không hỗ trợ lưu/chia sẻ tệp",
          });
        }
      } else {
        throw new Error("Không thể tải file");
      }
    } catch (error) {
      console.error("Lỗi tải CV:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi tải CV",
        text2: "File có thể đã bị xoá hoặc cấu hình chặn.",
      });
    } finally {
      // Dọn dẹp bộ nhớ đệm ngay sau khi hoàn thành hoặc có lỗi
      try {
        if (fileUri) {
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
            console.log("🧹 Đã giải phóng bộ nhớ đệm cho tệp:", safeFileName);
          }
        }
      } catch (cleanupError) {
        console.error("Lỗi dọn dẹp file tạm:", cleanupError);
      }
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
        ]}
      >
        <Users size={40} color={isDark ? "#888" : "#AAA"} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Chưa có ứng viên nào
      </Text>
      <Text style={styles.emptySub}>
        Khi có người nộp đơn vào công việc của bạn, hồ sơ sẽ xuất hiện tại đây.
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0" },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Quản lý ứng viên
        </Text>
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
            const profile = Array.isArray(item.user_profiles)
              ? item.user_profiles[0]
              : item.user_profiles;
            const job = Array.isArray(item.job_posts)
              ? item.job_posts[0]
              : item.job_posts;
            const cv = Array.isArray(item.user_cvs)
              ? item.user_cvs[0]
              : item.user_cvs;

            const applicantName = profile?.full_name || "Ứng viên ẩn danh";
            const avatarUrl = profile?.avatar_url;
            const jobTitle = job?.title || "Công việc không xác định";

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? "#0d0d0d" : "#FFF",
                    borderColor: isDark ? "#2C2C2E" : "#E5E5EA",
                  },
                ]}
              >
                {/* Header: User Info */}
                <View style={styles.cardHeader}>
                  <Image
                    source={
                      avatarUrl
                        ? { uri: avatarUrl }
                        : {
                            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(applicantName || "U")}&background=8e44ad&color=fff`,
                          }
                    }
                    style={styles.avatar}
                  />
                  <View style={styles.userInfo}>
                    <Text
                      style={[styles.userName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {applicantName}
                    </Text>
                    <Text style={styles.applyDate}>
                      Gửi {timeAgo(item.created_at)}
                    </Text>
                  </View>
                  <View style={styles.badgeWrap}>
                    {item.status === "accepted" && (
                      <Text style={[styles.badge, styles.badgeAccepted]}>
                        Đã nhận
                      </Text>
                    )}
                    {item.status === "rejected" && (
                      <Text style={[styles.badge, styles.badgeRejected]}>
                        Từ chối
                      </Text>
                    )}
                    {item.status === "pending" && (
                      <Text style={[styles.badge, styles.badgePending]}>
                        Chờ duyệt
                      </Text>
                    )}
                  </View>
                </View>

                {/* Job Title */}
                <View
                  style={[
                    styles.infoRow,
                    { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
                  ]}
                >
                  <Text style={styles.infoLabel}>Vị trí:</Text>
                  <Text
                    style={[styles.infoValue, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {jobTitle}
                  </Text>
                </View>

                {/* Contact Info (if any) */}
                {(item.full_name || item.email || item.phone) ? (
                  <View style={[styles.coverLetterWrap, { borderLeftColor: "#34C759" }]}>
                    <Text style={[styles.coverLetterTitle, { color: theme.text }]}>
                      Thông tin liên hệ:
                    </Text>
                    {item.full_name ? (
                      <Text style={[styles.contactText, { color: isDark ? "#AAA" : "#555" }]}>
                        Họ Tên: {item.full_name}
                      </Text>
                    ) : null}
                    {item.email ? (
                      <Text style={[styles.contactText, { color: isDark ? "#AAA" : "#555" }]}>
                        Email: {item.email}
                      </Text>
                    ) : null}
                    {item.phone ? (
                      <Text style={[styles.contactText, { color: isDark ? "#AAA" : "#555" }]}>
                        SĐT: {item.phone}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Cover Letter (if any) */}
                {item.cover_letter ? (
                  <View style={styles.coverLetterWrap}>
                    <Text
                      style={[styles.coverLetterTitle, { color: theme.text }]}
                    >
                      Thư tự giới thiệu:
                    </Text>
                    <Text
                      style={[
                        styles.coverLetterText,
                        { color: isDark ? "#AAA" : "#555" },
                      ]}
                    >
                      {item.cover_letter}
                    </Text>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.cvBtn,
                      { borderColor: isDark ? "#444" : "#DDD" },
                    ]}
                    onPress={() => {
                      if (cv?.file_url) {
                        setPreviewUrl(cv.file_url);
                        setPreviewFileName(cv.file_name);
                      } else {
                        Toast.show({
                          type: "error",
                          text1: "CV không tồn tại",
                          text2: "File CV có thể đã bị xoá",
                        });
                      }
                    }}
                  >
                    <FileText size={18} color={theme.text} />
                    <Text
                      style={[styles.cvBtnText, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {cv?.file_name || "Xem CV"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.downloadBtn,
                      { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
                    ]}
                    onPress={() =>
                      cv?.file_url &&
                      handleDownloadCV(
                        cv.file_url,
                        cv.file_name || "CV_Ung_Vien.pdf",
                      )
                    }
                  >
                    <Download size={20} color={theme.text} />
                  </TouchableOpacity>

                  {item.status === "pending" && (
                    <View style={styles.statusActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.rejectBtn,
                          updatingId === item.id && { opacity: 0.5 },
                        ]}
                        onPress={() =>
                          handleUpdateStatus(
                            item.id,
                            "rejected",
                            profile?.id,
                            jobTitle,
                          )
                        }
                        disabled={updatingId === item.id}
                      >
                        <X size={20} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.acceptBtn,
                          updatingId === item.id && { opacity: 0.5 },
                        ]}
                        onPress={() =>
                          handleUpdateStatus(
                            item.id,
                            "accepted",
                            profile?.id,
                            jobTitle,
                          )
                        }
                        disabled={updatingId === item.id}
                      >
                        <Check size={20} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Tích hợp Modal phía dưới ngầm */}
      <CVPreviewModal
        visible={previewUrl !== null}
        onClose={() => setPreviewUrl(null)}
        fileUrl={previewUrl}
        fileName={previewFileName}
      />
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
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  applyDate: { fontSize: 12, color: "#8E8E93" },
  badgeWrap: { paddingLeft: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  badgeAccepted: { backgroundColor: "#7ce695", color: "#1b632a" },
  badgeRejected: { backgroundColor: "#fa808a", color: "#721c24" },
  badgePending: { backgroundColor: "#fceaae", color: "#856404" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: { fontSize: 13, color: "#8E8E93", marginRight: 8 },
  infoValue: { fontSize: 14, fontWeight: "600", flex: 1 },
  coverLetterWrap: {
    marginBottom: 16,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#8e44ad",
  },
  coverLetterTitle: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  coverLetterText: { fontSize: 14, lineHeight: 20 },
  contactText: { fontSize: 14, lineHeight: 20, marginTop: 2, fontWeight: "500" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    marginRight: 8,
  },
  cvBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    height: 44,
  },
  cvBtnText: { marginLeft: 8, fontSize: 14, fontWeight: "500", flex: 1 },
  statusActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: { backgroundColor: "#e74c3c", marginRight: 8 },
  acceptBtn: { backgroundColor: "#2ecc71" },
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
