import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/themes";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import { ENV } from "@/config";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const { width } = Dimensions.get("window");

export default function UploadCVScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const { user, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && !user) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để sử dụng tính năng này");
      router.replace("/login");
    }
  }, [user, userLoading]);

  const pickDocument = async () => {
    if (uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể chọn tài liệu");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/pdf",
      });

      const response = await axios.post(
        `${ENV.API_URL}/cv/upload?user_id=${user.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 90000, // Đợi AI tối đa 90s
        }
      );

      if (response.data.success) {
        // Điều hướng chuẩn để reset Stack của Tab Analysis
        router.replace("/analysis");
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Lỗi phân tích",
        "Không thể kết nối đến server, vui lòng thử lại sau."
      );
    } finally {
      setUploading(false);
    }
  };

  // Màng Loading ngăn chặn tương tác
  const LoadingModal = () => (
    <Modal transparent visible={uploading} animationType="fade">
      <BlurView intensity={isDark ? 50 : 80} tint={isDark ? "dark" : "light"} style={styles.modalOverlay}>
        <View style={[styles.loadingCard, { backgroundColor: isDark ? "#1C1C1E" : "#FFF" }]}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingTitle, { color: theme.text }]}>Louis AI is working</Text>
          <Text style={styles.loadingSub}>
            Đang phân tích kỹ năng và kinh nghiệm từ CV của bạn...
          </Text>
          <View style={styles.progressContainer}>
            <LinearGradient
              colors={[accentColor, "#c084fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressBarFill}
            />
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#F8F9FA" }]}>
      <LoadingModal />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
            disabled={uploading}
          >
            <Ionicons name="chevron-back" size={28} color={uploading ? "#D1D1D6" : theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Tải lên CV</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Tải lên bản PDF để AI bắt đầu phân tích kỹ năng và gợi ý việc làm phù hợp.
          </Text>

          {/* DROPZONE */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.dropzone,
              {
                borderColor: selectedFile ? accentColor : "#D1D1D6",
                backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                borderStyle: selectedFile ? "solid" : "dashed",
              },
            ]}
            onPress={pickDocument}
            disabled={uploading}
          >
            <LinearGradient
              colors={selectedFile ? ["rgba(142, 68, 173, 0.05)", "transparent"] : ["transparent", "transparent"]}
              style={styles.gradientBg}
            >
              <Ionicons
                name={selectedFile ? "document-text" : "cloud-upload-outline"}
                size={64}
                color={selectedFile ? accentColor : "#AEAEB2"}
              />
              <Text style={[styles.dropzoneText, { color: theme.text }]}>
                {selectedFile ? selectedFile.name : "Nhấn để chọn file PDF"}
              </Text>
              {selectedFile && (
                <Text style={styles.fileSize}>
                  {(selectedFile.size! / (1024 * 1024)).toFixed(2)} MB
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>Hệ thống bảo mật dữ liệu cá nhân của bạn</Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.uploadBtn,
              { backgroundColor: selectedFile && !uploading ? accentColor : "#AEAEB2" },
            ]}
            disabled={!selectedFile || uploading}
            onPress={handleUpload}
          >
            <Text style={styles.uploadBtnText}>Bắt đầu phân tích</Text>
            <Ionicons name="sparkles" size={18} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 60 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: "800", marginLeft: 10 },
  content: { flex: 1, padding: 24, alignItems: "center" },
  subtitle: { textAlign: "center", color: "#8E8E93", fontSize: 15, marginBottom: 40, paddingHorizontal: 10 },
  
  dropzone: { width: "100%", height: 280, borderRadius: 32, borderWidth: 2, overflow: "hidden" },
  gradientBg: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  dropzoneText: { marginTop: 20, fontSize: 16, fontWeight: "700", textAlign: "center" },
  fileSize: { marginTop: 10, color: "#8E8E93", fontSize: 13 },
  
  infoBox: { flexDirection: "row", alignItems: "center", marginTop: 25, width: "100%", justifyContent: 'center' },
  infoText: { color: "#8E8E93", fontSize: 13, marginLeft: 8 },
  
  uploadBtn: {
    position: "absolute", bottom: 40, width: width - 48, height: 60,
    borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center",
    shadowColor: "#8e44ad", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8
  },
  uploadBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Modal Loading Styles
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingCard: {
    width: width * 0.85, padding: 35, borderRadius: 35, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 30, elevation: 15
  },
  loadingTitle: { fontSize: 20, fontWeight: "800", marginTop: 25 },
  loadingSub: { fontSize: 14, color: "#8E8E93", textAlign: "center", marginTop: 10, lineHeight: 20 },
  progressContainer: { width: "100%", height: 6, backgroundColor: "#F2F2F7", borderRadius: 3, marginTop: 25, overflow: 'hidden' },
  progressBarFill: { width: "90%", height: "100%", borderRadius: 3 }
});