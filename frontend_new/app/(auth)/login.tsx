import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Keyboard, 
  TouchableWithoutFeedback,
  useColorScheme
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const theme = {
    bg: isDark ? '#000' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#1C1C1E',
    subtext: isDark ? '#8E8E93' : '#666666',
    inputBg: isDark ? '#111' : '#F2F2F7',
  };

  const { isAvailable, authenticate, getBiometricLabel, getBiometricIcon } = useBiometricAuth();

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('Lỗi', error.message);
      setLoading(false);
    } else {
      router.replace('../(tabs)/home');
      setLoading(false);
    }
  };

  const onForgotPassword = () => {
    router.push('../(auth)/forgot-password');
  };

  return (
    // 🎯 CHẠM NGOÀI ĐỂ TẮT BÀN PHÍM
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.inner}>
          
          {/* LOGO & CHÀO MỪNG */}
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: accentColor }]}>
              <Ionicons name="sparkles" size={36} color="#fff" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Chào Louis,</Text>
            <Text style={styles.subtitle}>Đăng nhập để khám phá cơ hội mới cùng AI</Text>
          </View>

          {/* Ô NHẬP LIỆU */}
          <View style={styles.form}>
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: theme.inputBg },
              focusedInput === 'email' && { borderColor: accentColor, borderWidth: 1.5 }
            ]}>
              <Ionicons name="mail-outline" size={20} color={focusedInput === 'email' ? accentColor : "#999"} />
              <TextInput
                placeholder="Email của bạn"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={[
              styles.inputWrapper, 
              { backgroundColor: theme.inputBg },
              focusedInput === 'password' && { borderColor: accentColor, borderWidth: 1.5 }
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedInput === 'password' ? accentColor : "#999"} />
              <TextInput
                placeholder="Mật khẩu"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <Ionicons 
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={onForgotPassword}>
              <Text style={{ color: accentColor, fontWeight: '600' }}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: accentColor }]} 
              onPress={onLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng nhập</Text>}
            </TouchableOpacity>
          </View>

          {/* SINH TRẮC HỌC & ĐĂNG KÝ */}
          <View style={styles.footer}>
            {/* {isAvailable && (
              <TouchableOpacity 
                style={[styles.biometricBtn, { borderColor: accentColor }]}
                // onPress={authenticate}
              >
                <Ionicons name={getBiometricIcon() as any} size={24} color={accentColor} />
                <Text style={[styles.biometricText, { color: accentColor }]}>
                  Dùng {getBiometricLabel()}
                </Text>
              </TouchableOpacity>
            )} */}

            <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
              <Text style={[styles.linkText, { color: theme.subtext }]}>
                Chưa có tài khoản à? <Text style={{ color: accentColor, fontWeight: '800' }}>Đăng ký ngay</Text> đi nè!
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 50 },
  logoCircle: { 
    width: 76, 
    height: 76, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    shadowColor: '#8e44ad',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#8E8E93', marginTop: 10, textAlign: 'center', paddingHorizontal: 30 },
  form: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  input: { flex: 1, height: '100%', fontSize: 16, marginLeft: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 25 },
  loginButton: {
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8e44ad',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  footer: { marginTop: 40, alignItems: 'center' },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 30
  },
  biometricText: { fontSize: 16, fontWeight: '700' },
  registerLink: { padding: 10 },
  linkText: { fontSize: 15 },
});