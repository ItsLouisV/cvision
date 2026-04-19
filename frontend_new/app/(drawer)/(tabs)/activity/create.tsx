import { ENV } from "@/config";
import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function CreateInterviewScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";
  const { user } = useCurrentUser();

  const [jobTitle, setJobTitle] = useState("");
  const [level, setLevel] = useState("Junior"); // Default level
  const [language, setLanguage] = useState("Vietnamese"); // Default language
  const [creating, setCreating] = useState(false);

  const [cvContent, setCvContent] = useState<any>(null);

  const levels = ["Intern", "Fresher", "Junior", "Middle", "Senior"];
  const languages = ["Vietnamese", "English", "Bilingual"];

  useEffect(() => {
    const fetchCvData = async () => {
      if (!user) return;
      try {
        // Tự động lấy CV mới nhất để gợi ý Job Title và gửi text thô cho AI
        const { data: cvData } = await supabase
          .from("user_cvs")
          .select("parsed_data, raw_text")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (cvData) {
          if (cvData.raw_text) {
            setCvContent(cvData.raw_text);
          }

          if (cvData.parsed_data) {
            let parsed = cvData.parsed_data;
            if (typeof parsed === "string") {
              try {
                parsed = JSON.parse(parsed);
              } catch (e) {}
            }

            // Lấy vị trí gợi ý đầu tiên nếu có
            const roles = parsed?.recommendations?.suitable_roles || [];
            if (roles && roles.length > 0) {
              setJobTitle(roles[0]); // Auto-fill
            }
          }
        }
      } catch (error) {
        console.log("No CV data found for auto-fill");
      }
    };
    fetchCvData();
  }, [user]);

  const handleStartInterview = async () => {
    if (!jobTitle.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập vị trí ứng tuyển.");
      return;
    }

    if (!user) {
      Alert.alert("Chưa đăng nhập", "Vui lòng đăng nhập để tạo phỏng vấn.");
      return;
    }

    setCreating(true);
    try {
      // Dùng ENV.API_URL thay vì IP cứng
      const payload: any = {
        user_id: user.id,
        full_name: user?.user_metadata?.full_name || "Ứng viên",
        job_title: jobTitle,
        level: level,
        language: language,
      };

      if (cvContent) {
        payload.cv_data = cvContent;
      }

      console.log(
        "=== Payload gửi sang AI Backend ===",
        JSON.stringify(payload, null, 2),
      );

      const response = await axios.post(
        `${ENV.API_URL}/interview/start`,
        payload,
      );

      if (response.data.success) {
        // Tắt modal và mở session
        router.back();
        setTimeout(() => {
          router.push({
            pathname: "/interview/[session_id]",
            params: { session_id: response.data.session_id },
          });
        }, 300);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Lỗi kết nối",
        "Không thể kết nối đến server, vui lòng thử lại sau.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#F8F9FA" },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Thiết lập phỏng vấn
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.headerIcon}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: "rgba(142, 68, 173, 0.1)" },
                ]}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={40}
                  color={accentColor}
                />
              </View>
              <Text style={[styles.mainHeading, { color: theme.text }]}>
                Vị trí ứng tuyển
              </Text>
              <Text style={styles.subHeading}>
                Louis AI sẽ thiết kế câu hỏi dựa trên vị trí và cấp độ độ khó
                này.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Tên vị trí (VD: Frontend Developer, Data Analyst...)*
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                    color: theme.text,
                    borderColor: isDark ? "#333" : "#E5E5EA",
                  },
                ]}
                placeholder="Nhập tên vị trí..."
                placeholderTextColor="#AEAEB2"
                value={jobTitle}
                onChangeText={setJobTitle}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Cấp độ kinh nghiệm
              </Text>
              <View style={styles.levelRow}>
                {levels.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.levelChip,
                      {
                        backgroundColor:
                          level === lvl
                            ? "rgba(142, 68, 173, 0.1)"
                            : isDark
                              ? "#1C1C1E"
                              : "#FFF",
                        borderColor:
                          level === lvl
                            ? accentColor
                            : isDark
                              ? "#333"
                              : "#E5E5EA",
                      },
                    ]}
                    onPress={() => setLevel(lvl)}
                  >
                    <Text
                      style={[
                        styles.levelText,
                        {
                          color: level === lvl ? accentColor : "#8E8E93",
                          fontWeight: level === lvl ? "700" : "500",
                        },
                      ]}
                    >
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Ngôn ngữ phỏng vấn
              </Text>
              <View style={styles.levelRow}>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.levelChip,
                      {
                        backgroundColor:
                          language === lang
                            ? "rgba(142, 68, 173, 0.1)"
                            : isDark
                              ? "#1C1C1E"
                              : "#FFF",
                        borderColor:
                          language === lang
                            ? accentColor
                            : isDark
                              ? "#333"
                              : "#E5E5EA",
                      },
                    ]}
                    onPress={() => setLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.levelText,
                        {
                          color: language === lang ? accentColor : "#8E8E93",
                          fontWeight: language === lang ? "700" : "500",
                        },
                      ]}
                    >
                      {lang === "Vietnamese" ? "Tiếng Việt" : lang === "English" ? "Tiếng Anh" : "Song ngữ"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Start Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.startBtn,
              {
                backgroundColor:
                  jobTitle.trim().length > 0 && !creating
                    ? accentColor
                    : "#AEAEB2",
              },
            ]}
            disabled={jobTitle.trim().length === 0 || creating}
            onPress={handleStartInterview}
          >
            {creating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.startBtnText}>Bắt đầu phỏng vấn</Text>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#FFF"
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  closeBtn: {
    padding: 5,
    marginLeft: -5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  headerIcon: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
  },
  subHeading: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  levelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 10 : 20,
  },
  startBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8e44ad",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  startBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
