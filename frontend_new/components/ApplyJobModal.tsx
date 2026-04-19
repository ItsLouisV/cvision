import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { FileText, X, CheckCircle2 } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { ENV } from "@/config";

interface CVData {
  id: string;
  file_name: string;
  is_default: boolean;
}

interface ApplyJobModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  jobOwnerId: string;
  jobTitle: string;
  isDark: boolean;
  theme: any;
  onSuccess: () => void;
}

export const ApplyJobModal: React.FC<ApplyJobModalProps> = ({
  visible,
  onClose,
  jobId,
  jobOwnerId,
  jobTitle,
  isDark,
  theme,
  onSuccess,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cvs, setCvs] = useState<CVData[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const surfaceBg = isDark ? "#1C1C1E" : "#FFF";
  const secondaryBg = isDark ? "#2C2C2E" : "#F2F2F7";
  const separator = isDark ? "#38383A" : "#E5E5EA";
  const secondaryText = isDark ? "#8E8E93" : "#8E8E93";

  useEffect(() => {
    if (visible) {
      fetchCvs();
    } else {
      // Reset form
      setCoverLetter("");
      setSelectedCvId(null);
      setFullName("");
      setEmail("");
      setPhone("");
    }
  }, [visible]);

  const fetchCvs = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setFullName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
      const { data: profile } = await supabase.from('user_profiles').select('phone').eq('id', user.id).single();
      if (profile && profile.phone) {
        setPhone(profile.phone);
      }

      // Check if user has CVs
      const { data, error } = await supabase
        .from("user_cvs")
        .select("id, file_name, is_default")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setCvs(data);
        const defaultCv = data.find((cv) => cv.is_default);
        if (defaultCv) {
          setSelectedCvId(defaultCv.id);
        } else {
          setSelectedCvId(data[0].id);
        }
      } else {
        setCvs([]);
      }
    } catch (error) {
      console.error("Error fetching CVs:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi thiết lập",
        text2: "Không thể lấy danh sách CV",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadNewCV = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const file = res.assets[0];

      setIsUploading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      const formData = new FormData();
      // @ts-ignore
      formData.append("file", {
        uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
        name: file.name,
        type: file.mimeType || "application/pdf",
      });

      const response = await fetch(`${ENV.API_URL}/cv/upload?user_id=${user.id}&is_default=false`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Lưu file thất bại");
      }

      const responseData = await response.json();
      if (responseData.success) {
         Toast.show({ type: "success", text1: "Tải file thành công" });
         await fetchCvs();
         setSelectedCvId(responseData.cv_id);
      }
    } catch (e: any) {
      console.error(e);
      Toast.show({ type: "error", text1: "Lỗi tải file", text2: e.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedCvId) {
      Toast.show({
        type: "error",
        text1: "Chưa chọn hồ sơ",
        text2: "Vui lòng chọn hoặc tải lên một CV để ứng tuyển.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Chưa đăng nhập");

      const { error } = await supabase.from("applications").insert([
        {
          job_id: jobId,
          user_id: user.id,
          cv_id: selectedCvId,
          cover_letter: coverLetter.trim() || null,
          full_name: fullName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
      ]);

      if (error) {
        if (error.code === "23505") { // unique constraint violation
          throw new Error("Bạn đã ứng tuyển công việc này rồi.");
        }
        throw error;
      }

      // Generate Notification to Job Owner
      if (jobOwnerId && jobOwnerId !== user.id) {
        const applicantName = user.user_metadata?.full_name || "Một ứng viên";
        await supabase.from("notifications").insert([
          {
            user_id: jobOwnerId,
            title: "Có ứng viên mới!",
            content: `${applicantName} vừa ứng tuyển vào vị trí ${jobTitle}. Bấm để xem ngay!`,
            data: { type: "application", job_id: jobId, applicant_id: user.id },
            type: "application",
          },
        ]);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "Ứng tuyển thành công",
        text2: "Nhà tuyển dụng sẽ sớm xem hồ sơ của bạn.",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error applying:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi ứng tuyển",
        text2: error.message || "Không thể ứng tuyển lúc này.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={onClose}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>

            <View style={[styles.modalContent, { backgroundColor: surfaceBg }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: separator }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Ứng tuyển công việc
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: Platform.OS === "ios" ? 400 : 350 }}
                showsVerticalScrollIndicator={false}
              >
                {/* CV List */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Chọn CV của bạn
                  </Text>

                  {loading ? (
                    <ActivityIndicator style={{ padding: 20 }} color="#007AFF" />
                  ) : cvs.length === 0 ? (
                    <View style={styles.emptyState}>
                      <FileText size={40} color={secondaryText} />
                      <Text style={[styles.emptyText, { color: secondaryText }]}>
                        Chưa có CV nào trong hệ thống
                      </Text>
                      <TouchableOpacity
                        style={styles.uploadBtn}
                        onPress={() => {
                          onClose();
                          // Try to navigate to a screen to upload CV
                          // You can adjust the route as per your structure
                          router.push("/(drawer)/(tabs)/profile");
                        }}
                      >
                        <Text style={styles.uploadBtnText}>Thêm hồ sơ CV</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    cvs.map((cv) => (
                      <TouchableOpacity
                        key={cv.id}
                        style={[
                          styles.cvItem,
                          {
                            backgroundColor: secondaryBg,
                            borderColor:
                              selectedCvId === cv.id ? "#8e44ad" : "transparent",
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCvId(cv.id);
                        }}
                      >
                        <FileText size={24} color={selectedCvId === cv.id ? "#8e44ad" : theme.text} />
                        <View style={styles.cvInfo}>
                          <Text style={[styles.cvName, { color: theme.text }]} numberOfLines={1}>
                            {cv.file_name}
                          </Text>
                          {cv.is_default && (
                            <Text style={styles.cvDefaultText}>Mặc định</Text>
                          )}
                        </View>
                        {selectedCvId === cv.id ? (
                          <CheckCircle2 size={24} color="#8e44ad" />
                        ) : (
                          <View style={[styles.radioPlaceholder, { borderColor: separator }]} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}

                  <TouchableOpacity
                    style={[styles.uploadNewBtn, { borderColor: separator }]}
                    onPress={handleUploadNewCV}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color="#8e44ad" />
                    ) : (
                      <>
                        <FileText size={20} color="#8e44ad" />
                        <Text style={[styles.uploadNewBtnText, { color: theme.text }]}>
                          Tải lên CV khác (PDF)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Thông tin liên hệ */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Thông tin liên hệ
                  </Text>
                  <TextInput
                    style={[
                      styles.contactInput,
                      { backgroundColor: secondaryBg, color: theme.text, borderColor: separator },
                    ]}
                    placeholder="Họ Tên"
                    placeholderTextColor={secondaryText}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                  <TextInput
                    style={[
                      styles.contactInput,
                      { backgroundColor: secondaryBg, color: theme.text, borderColor: separator, marginTop: 10 },
                    ]}
                    placeholder="Email"
                    keyboardType="email-address"
                    placeholderTextColor={secondaryText}
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    style={[
                      styles.contactInput,
                      { backgroundColor: secondaryBg, color: theme.text, borderColor: separator, marginTop: 10 },
                    ]}
                    placeholder="Số điện thoại"
                    keyboardType="phone-pad"
                    placeholderTextColor={secondaryText}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                {/* Cover Letter */}
                {cvs.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Thư xin việc (Tuỳ chọn)
                    </Text>
                    <TextInput
                      style={[
                        styles.coverInput,
                        {
                          backgroundColor: secondaryBg,
                          color: theme.text,
                          borderColor: separator,
                        },
                      ]}
                      placeholder="Viết một đoạn ngắn giới thiệu bản thân..."
                      placeholderTextColor={secondaryText}
                      multiline
                      value={coverLetter}
                      onChangeText={setCoverLetter}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      {cvs.length > 0 && (
        <View style={[styles.footer, { borderTopColor: separator, backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleApply}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Gửi hồ sơ ứng tuyển</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    minHeight: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 15,
  },
  uploadBtn: {
    backgroundColor: "#8e44ad",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  cvItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  cvInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cvName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  cvDefaultText: {
    fontSize: 12,
    color: "#8e44ad",
    fontWeight: "500",
  },
  radioPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  uploadNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 10,
    gap: 8,
  },
  uploadNewBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  contactInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  coverInput: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 100,
    padding: 12,
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    backgroundColor: "#8e44ad",
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
