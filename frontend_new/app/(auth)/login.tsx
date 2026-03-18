import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCachedSession, setHasCachedSession] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const { isAvailable, isEnabled, authenticate, getBiometricLabel, getBiometricIcon } = useBiometricAuth();

  // Kiểm tra xem có session cũ đã lưu không
  useEffect(() => {
    const checkCachedSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasCachedSession(!!session);
    };
    checkCachedSession();
  }, []);

  const showBiometricLogin = isAvailable;

  const handleBiometricLogin = async () => {
    const success = await authenticate();
    if (success) {
      router.replace('/(tabs)/home');
    } else {
      Alert.alert('Xác thực thất bại', 'Vui lòng thử lại hoặc đăng nhập bằng mật khẩu.');
    }
  };

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    
    // Gọi hàm đăng nhập của Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Lỗi đăng nhập', error.message);
      setLoading(false);
    } else {
      // Đăng nhập thành công, chuyển hướng vào App chính
      router.replace('/(tabs)/home');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]}>
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: accentColor }]}>
          <Ionicons name="sparkles" size={32} color="#fff" />
        </View>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Chào mừng trở lại</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình sự nghiệp</Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#666"
            style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            placeholder="Mật khẩu"
            placeholderTextColor="#666"
            style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.forgotBtn}
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={{ color: accentColor, textAlign: 'right', fontWeight: '600' }}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentColor }]} 
          onPress={onLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Nút đăng nhập sinh trắc học */}
      {showBiometricLogin && (
        <TouchableOpacity 
          style={[styles.biometricBtn, { borderColor: accentColor }]}
          onPress={handleBiometricLogin}
          activeOpacity={0.7}
        >
          <Ionicons name={getBiometricIcon() as any} size={24} color={accentColor} />
          <Text style={[styles.biometricText, { color: accentColor }]}>
            Đăng nhập bằng {getBiometricLabel()}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.footerLink}>
        <Text style={styles.linkText}>
          Chưa có tài khoản? <Text style={{ color: accentColor, fontWeight: '700' }}>Đăng ký ngay</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#666', marginTop: 8, textAlign: 'center' },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 68, 173, 0.1)',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footerLink: { marginTop: 32, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 15 },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    marginTop: 24,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
  },
});