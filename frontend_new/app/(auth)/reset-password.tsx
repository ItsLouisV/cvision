import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const url = Linking.useLinkingURL();

  useEffect(() => {
    const setSessionFromUrl = async () => {
      if (url) {
        console.log("ResetPassword URL:", url);
        
        // Supabase often sends tokens in a hash fragment for security: #access_token=...
        // Linking.parse does not always reliably extract from the hash.
        let accessToken = '';
        let refreshToken = '';

        const paramsString = url.split('#')[1] || url.split('?')[1];
        if (paramsString) {
          const pairs = paramsString.split('&');
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key === 'access_token') accessToken = value;
            if (key === 'refresh_token') refreshToken = value;
          }
        }

        if (accessToken && refreshToken) {
          console.log("✅ Đang thiết lập Auth Session bằng Token mới...");
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) console.log("❌ Lỗi thiết lập session:", error.message);
          else console.log("✅ Đã thiết lập Auth Session thành công!");
        } else {
           console.log("❌ Không tìm thấy mã access_token trong đường link.");
        }
      }
    };

    setSessionFromUrl();
  }, [url]);

  const onUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ mật khẩu mới');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    
    // Gọi API update password của Supabase
    // Người dùng nhấn link từ email sẽ được Supabase xử lý auth session qua deep link
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Mật khẩu đã được cập nhật. Đang chuyển về trang chủ...',
      });
      // Đổi mật khẩu thành công, chuyển về trang chủ
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={isDark ? '#FFF' : '#000'} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: 'rgba(142, 68, 173, 0.1)' }]}>
          <Ionicons name="lock-closed-outline" size={32} color={accentColor} />
        </View>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Tạo mật khẩu mới</Text>
        <Text style={styles.subtitle}>
          Vui lòng nhập mật khẩu mới của bạn bên dưới.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            placeholder="Mật khẩu mới"
            placeholderTextColor="#666"
            style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            placeholder="Xác nhận mật khẩu"
            placeholderTextColor="#666"
            style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentColor }]} 
          onPress={onUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10, padding: 8 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  form: { width: '100%', alignItems: 'center' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 68, 173, 0.1)',
    width: '100%',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
