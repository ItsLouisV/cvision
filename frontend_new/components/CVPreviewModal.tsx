import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { X, ExternalLink, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

interface CVPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string | null;
}

export const CVPreviewModal = ({
  visible,
  onClose,
  fileUrl,
  fileName,
}: CVPreviewModalProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const [isLoading, setIsLoading] = useState(true);

  if (!fileUrl) return null;

  // Xử lý URL hiển thị tuỳ hệ điều hành
  // Android WebView không vẽ được PDF nguyên bản, nên ta dùng Google Docs Proxy
  const viewerUrl =
    Platform.OS === "android"
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`
      : fileUrl;

  const handleOpenBrowser = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(fileUrl);
      onClose(); // Đóng Modal nếu mở ngoài
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Không thể mở trình duyệt bên ngoài.",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {/* Header An Toàn */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA",
              backgroundColor: isDark ? "#1C1C1E" : "#FFF",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsLoading(true);
              onClose();
            }}
          >
            <X size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <ShieldCheck size={16} color="#2ecc71" style={{ marginRight: 6 }} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {fileName || "Xem CV"}
            </Text>
          </View>

          <TouchableOpacity
           style={styles.headerBtn} 
           onPress={handleOpenBrowser}
           hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <ExternalLink size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Nội Dung WebView */}
        <View style={styles.content}>
          {isLoading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#8e44ad" />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Đang nạp dữ liệu bảo mật...
              </Text>
              {Platform.OS === "android" && (
                <Text style={styles.subLoadingText}>
                  (Có thể mất vài giây qua máy chủ Google)
                </Text>
              )}
            </View>
          )}

          <WebView
            source={{ uri: viewerUrl }}
            style={{ flex: 1, opacity: isLoading ? 0 : 1, backgroundColor: theme.background }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              Toast.show({
                type: "error",
                text1: "Lỗi tải ảnh/PDF",
                text2: "Hãy thử mở bằng Trình duyệt Ngoại",
              });
            }}
            // BẢO MẬT: Bật JS cho Android chạy Google Docs, Tắt hoàn toàn JS cho iOS đọc PDF thuần
            javaScriptEnabled={Platform.OS === "android"}
            javaScriptCanOpenWindowsAutomatically={false}
            domStorageEnabled={true}
            allowFileAccess={false}
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            mixedContentMode="never" // Chỉ HTTPS
            originWhitelist={["https://*"]}
            onShouldStartLoadWithRequest={(request) => {
              // BẢO MẬT NÂNG CAO: Chống mọi điều hướng link lạ khác ngoài URL đã chỉ định
              if (
                request.url.startsWith("https://docs.google.com") ||
                request.url.startsWith("https://guek") || 
                request.url.includes("supabase.co")
              ) {
                return true;
              }
              console.warn("Đã chặn request tới: ", request.url);
              return false;
            }}
          />
        </View>
      </SafeAreaView>
      <Toast />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    height: 56,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
    marginHorizontal: -8,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    position: "relative",
  },
  loaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "500",
  },
  subLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
});
