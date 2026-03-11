import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";

export default function Index() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation cho con logo
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Chạy hiệu ứng mờ / tỏ liên tục cho Logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const checkSession = async () => {
      // Đảm bảo Flash Screen tồn tại ít nhất 1.5 giây cho ứng viên nhìn logo
      const startTime = Date.now();

      // 1. Lấy session hiện tại từ AsyncStorage
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.log("❌ Lỗi lấy Session:", error.message);
      }

      if (currentSession) {
        console.log("✅ ĐÃ TÌM THẤY SESSION!");
      } else {
        console.log("ℹ️ Chưa có Session (Người dùng chưa đăng nhập)");
      }

      // Tính thời gian fetch để delay nếu quá nhanh
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 1500 - elapsed));
      }

      setSession(currentSession);
      setLoading(false);
    };

    checkSession();

    // Lắng nghe nếu user logout hoặc login ở chỗ khác
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("🔔 Trạng thái Auth thay đổi:", _event);
        setSession(session);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View
        style={[
          styles.flashContainer,
          { backgroundColor: isDark ? "#000" : "#F8F9FA" },
        ]}
      >
        <Animated.Image
          source={require("@/assets/images/logo.png")}
          style={[styles.logo, { transform: [{ scale: pulseAnim }] }]}
          resizeMode="contain"
        />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Đang kiểm tra phiên làm việc...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  flashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#8e44ad",
    fontSize: 16,
    fontWeight: "500",
  },
});
