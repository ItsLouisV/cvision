import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, TouchableOpacity, useColorScheme, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

export default function Index() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Trạng thái biometric gate
  const [biometricPending, setBiometricPending] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);

  const router = useRouter();
  const url = Linking.useLinkingURL();

  const { checkAndAuthenticate, getBiometricLabel, getBiometricIcon } = useBiometricAuth();

  // Animation cho con logo
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (url) {
      console.log("💎 Link nhận được:", url);

      const isRecovery = url.includes('type=recovery') || url.includes('reset-password');

      if (isRecovery) {
        const timer = setTimeout(() => {
          console.log("🚀 Đang điều hướng sang Reset Password...");
          router.replace('/(auth)/reset-password');
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [url]);

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
      const startTime = Date.now();

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

      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 1500 - elapsed));
      }

      // Nếu có session → kiểm tra biometric
      if (currentSession) {
        setBiometricPending(true);
        const biometricOk = await checkAndAuthenticate();
        setBiometricPending(false);
        if (biometricOk) {
          setSession(currentSession);
        } else {
          // Xác thực thất bại → hiện UI thử lại
          // Lưu session tạm để UI biometric gate hoạt động
          setSession(currentSession);
          setBiometricFailed(true);
          // Fade in UI thử lại
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }

      setLoading(false);
    };

    checkSession();

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

  // Hàm thử lại xác thực sinh trắc học
  const handleRetryBiometric = async () => {
    setBiometricFailed(false);
    const success = await checkAndAuthenticate();
    if (success) {
      setBiometricPending(false);
      setBiometricFailed(false);
    } else {
      setBiometricFailed(true);
    }
  };

  // Hàm đăng nhập lại (logout)
  const handleLoginAgain = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setBiometricPending(false);
    setBiometricFailed(false);
  };

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

  // Biometric gate: đã có session nhưng xác thực thất bại
  if (session && biometricFailed) {
    return (
      <View style={[styles.flashContainer, { backgroundColor: isDark ? "#000" : "#F8F9FA" }]}>
        <Animated.View style={[styles.biometricContainer, { opacity: fadeAnim }]}>
          {/* Icon sinh trắc học */}
          <View style={styles.biometricIconWrapper}>
            <Ionicons 
              name={getBiometricIcon() as any} 
              size={64} 
              color="#8e44ad" 
            />
          </View>

          <Text style={[styles.biometricTitle, { color: isDark ? '#fff' : '#000' }]}>
            Xác thực cần thiết
          </Text>
          <Text style={styles.biometricSubtitle}>
            Sử dụng {getBiometricLabel()} để mở khóa ứng dụng
          </Text>

          {/* Nút thử lại */}
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetryBiometric}
            activeOpacity={0.8}
          >
            <Ionicons name={getBiometricIcon() as any} size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Thử lại {getBiometricLabel()}</Text>
          </TouchableOpacity>

          {/* Nút đăng nhập lại */}
          <TouchableOpacity 
            style={styles.loginAgainButton}
            onPress={handleLoginAgain}
            activeOpacity={0.7}
          >
            <Text style={styles.loginAgainText}>Đăng nhập bằng tài khoản khác</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // Đang chờ biometric (prompt đang hiện)
  if (session && biometricPending) {
    return (
      <View style={[styles.flashContainer, { backgroundColor: isDark ? "#000" : "#F8F9FA" }]}>
        <Animated.Image
          source={require("@/assets/images/logo.png")}
          style={[styles.logo, { transform: [{ scale: pulseAnim }] }]}
          resizeMode="contain"
        />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Đang xác thực...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="../(drawer)/(tabs)/home" />;
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
  biometricContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  biometricIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(142, 68, 173, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(142, 68, 173, 0.15)',
  },
  biometricTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  biometricSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8e44ad',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginAgainButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  loginAgainText: {
    color: '#8e44ad',
    fontSize: 15,
    fontWeight: '600',
  },
});
