import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';

import * as Linking from 'expo-linking';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const onResetPassword = async () => {
    try {
      if (!email) {
        Alert.alert('Thông báo', 'Vui lòng nhập email của bạn.');
        return;
      }
      
      setLoading(true);
      
      // 2. Tạo URL tự động dựa trên cấu hình app của Louis
      const redirectUrl = Linking.createURL('reset-password');
      
      // Log ra để Louis copy cái này dán vào Supabase Dashboard
      console.log("Copy link này dán vào Supabase:", redirectUrl);

      // 3. Gửi cho Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl, 
      });

      if (error) throw error;
      else {
        setIsSuccess(true);
        Toast.show({
          type: 'success',
          text1: 'Đã gửi email',
          text2: 'Kiểm tra hộp thư đến của bạn để đặt lại mật khẩu.',
        });
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: 'rgba(142, 68, 173, 0.1)' }]}>
          <Ionicons name="key-outline" size={32} color={accentColor} />
        </View>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Quên mật khẩu?</Text>
        <Text style={styles.subtitle}>
          Đừng lo, chỉ cần nhập email đăng ký và chúng tôi sẽ giúp bạn lấy lại mật khẩu.
        </Text>
      </View>

      <View style={styles.form}>
        {isSuccess ? (
          <View style={styles.successBox}>
            <Ionicons name="mail-unread-outline" size={48} color={accentColor} />
            <Text style={[styles.successText, { color: isDark ? '#fff' : '#333' }]}>
              Liên kết khôi phục đã được gửi tới:
            </Text>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 4, color: accentColor }}>{email}</Text>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: accentColor, marginTop: 32, width: '100%' }]} 
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Quay lại Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                placeholder="Email của bạn"
                placeholderTextColor="#666"
                style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: accentColor }]} 
              onPress={onResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Gửi liên kết khôi phục</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10, padding: 8 },
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
    marginBottom: 24,
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
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBox: { alignItems: 'center', padding: 24, width: '100%' },
  successText: { fontSize: 15, marginTop: 16, textAlign: 'center' },
});
