import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/utils/errorHelpers";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Toast from "react-native-toast-message";

// Khai báo kiểu vai trò dựa trên Enum của bạn
type UserRole = "candidate" | "employer";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("candidate"); // Mặc định là ứng viên
  const [loading, setLoading] = useState(false);

  // States cho UI
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isPassVisible, setIsPassVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";
  const theme = {
    bg: isDark ? "#000" : "#F8F9FA",
    card: isDark ? "#1C1C1E" : "#FFFFFF",
    text: isDark ? "#FFFFFF" : "#1C1C1E",
    subtext: isDark ? "#8E8E93" : "#666",
    inputBg: isDark ? "#111" : "#FFF",
  };

  const onRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin nhé!");
      return;
    }
    // KIỂM TRA ĐỊNH DẠNG EMAIL (REGEX)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        "Opps!",
        "Định dạng email này có vẻ chưa đúng rồi (ví dụ: abc@example.com).",
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert("Opps!", "Mật khẩu xác nhận không khớp mất rồi.");
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        "Mật khẩu yếu quá bạn êy!",
        "Mật khẩu cần ít nhất 6 ký tự nhé.",
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role, // LƯU VAI TRÒ VÀO METADATA
        },
      },
    });

    const errorMessage = mapSupabaseError(error?.message || "");

    if (error) {
      Toast.show({
        type: "error",
        text1: "Opps!",
        text2: errorMessage,
      });
      setLoading(false);
      return;
    }

    if (data.session === null) {
      Toast.show({
        type: "success",
        text1: "Thành công",
        text2: `Chào ${fullName}! Bạn đã tạo tài khoản thành công.`,
      });
      router.back();
    } else {
      router.replace("../(tabs)/home");
    }
    setLoading(false);
  };

  const RoleOption = ({
    type,
    label,
    icon,
    desc,
  }: {
    type: UserRole;
    label: string;
    icon: any;
    desc: string;
  }) => {
    const isSelected = role === type;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.roleCard,
          {
            backgroundColor: theme.card,
            borderColor: isSelected ? accentColor : "transparent",
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setRole(type);
        }}
      >
        <View
          style={[
            styles.roleIcon,
            {
              backgroundColor: isSelected
                ? accentColor
                : "rgba(142, 68, 173, 0.1)",
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={24}
            color={isSelected ? "#FFF" : accentColor}
          />
        </View>
        <Text style={[styles.roleLabel, { color: theme.text }]}>{label}</Text>
        <Text style={styles.roleDesc}>{desc}</Text>
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#F8F9FA" },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableOpacity
        style={[
          styles.backBtn,
          { backgroundColor: isDark ? "#1C1C1E" : "#FFF" },
        ]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
            Tạo tài khoản
          </Text>
          <Text style={styles.subtitle}>Chọn vai trò của bạn để bắt đầu</Text>
        </View>

        <View style={styles.roleContainer}>
          <RoleOption
            type="candidate"
            label="Ứng viên"
            icon="person-outline"
            desc="Tìm kiếm việc làm & luyện phỏng vấn"
          />
          <RoleOption
            type="employer"
            label="Nhà tuyển dụng"
            icon="business-outline"
            desc="Đăng tin tuyển dụng & quản lý CV"
          />
        </View>

        <View style={styles.form}>
          {/* HỌ TÊN */}
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBg },
              focusedInput === "name" && styles.focusedInput,
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={focusedInput === "name" ? accentColor : "#999"}
            />
            <TextInput
              placeholder="Họ và tên"
              placeholderTextColor="#999"
              style={[styles.input, { color: theme.text }]}
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedInput("name")}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* EMAIL */}
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBg },
              focusedInput === "email" && styles.focusedInput,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={focusedInput === "email" ? accentColor : "#999"}
            />
            <TextInput
              placeholder="Email đăng ký"
              placeholderTextColor="#999"
              style={[styles.input, { color: theme.text }]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* MẬT KHẨU */}
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBg },
              focusedInput === "pass" && styles.focusedInput,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={focusedInput === "pass" ? accentColor : "#999"}
            />
            <TextInput
              placeholder="Mật khẩu"
              placeholderTextColor="#999"
              style={[styles.input, { color: theme.text }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPassVisible}
              onFocus={() => setFocusedInput("pass")}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity onPress={() => setIsPassVisible(!isPassVisible)}>
              <Ionicons
                name={isPassVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          {/* XÁC NHẬN MẬT KHẨU */}
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.inputBg },
              focusedInput === "confirm" && styles.focusedInput,
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={focusedInput === "confirm" ? accentColor : "#999"}
            />
            <TextInput
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor="#999"
              style={[styles.input, { color: theme.text }]}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!isConfirmVisible}
              onFocus={() => setFocusedInput("confirm")}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity
              onPress={() => setIsConfirmVisible(!isConfirmVisible)}
            >
              <Ionicons
                name={isConfirmVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.mainButton, { backgroundColor: accentColor }]}
            onPress={onRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Đăng ký ngay</Text>
                <Ionicons name="sparkles" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.footerLink}
        >
          <Text style={styles.linkText}>
            Có tài khoản rồi à?{" "}
            <Text style={{ color: accentColor, fontWeight: "700" }}>
              Đăng nhập
            </Text>{" "}
            đi nè!
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24 },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 20,
    left: 10,
    width: 44,
    height: 44,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  header: { paddingHorizontal: 24, marginTop: 140, marginBottom: 25 },
  title: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 16, color: "#8E8E93", marginTop: 8 },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 30,
    gap: 12,
  },
  roleCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "flex-start",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  roleLabel: { fontSize: 16, fontWeight: "800" },
  roleDesc: { fontSize: 11, color: "#8E8E93", marginTop: 4, lineHeight: 15 },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#8e44ad",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  form: { paddingHorizontal: 24 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  focusedInput: { borderColor: "#8e44ad", borderWidth: 1.5 },
  input: { flex: 1, height: "100%", fontSize: 16, marginLeft: 12 },
  mainButton: {
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#8e44ad",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  footerLink: { marginTop: 32, marginBottom: 50, alignItems: "center" },
  linkText: { color: "#666", fontSize: 15 },
});
