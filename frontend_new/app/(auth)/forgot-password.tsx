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
  useColorScheme,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const theme = {
    bg: isDark ? '#000' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#1C1C1E',
    subtext: isDark ? '#8E8E93' : '#666666',
    inputBg: isDark ? '#111' : '#F2F2F7',
  };

  const onResetPassword = async () => {
    if (!email) {
      Alert.alert('Thông báo', 'Louis vui lòng nhập email để tiếp tục nhé!');
      return;
    }
    
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL('reset-password');
      console.log("Deep link cho Supabase:", redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl, 
      });

      if (error) throw error;
      
      setIsSuccess(true);
      Toast.show({
        type: 'success',
        text1: 'Thành công!',
        text2: 'Louis kiểm tra hòm thư để đặt lại mật khẩu nhé.',
      });
    } catch (error: any) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        
        {/* NÚT BACK SANG CHẢNH */}
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.inner}>
          {isSuccess ? (
            // --- GIAO DIỆN KHI GỬI THÀNH CÔNG ---
            <View style={styles.successContainer}>
              <View style={[styles.successIconCircle, { backgroundColor: 'rgba(50, 215, 75, 0.1)' }]}>
                <Ionicons name="mail-open-outline" size={60} color="#32D74B" />
              </View>
              <Text style={[styles.title, { color: theme.text, marginTop: 24 }]}>Kiểm tra Email</Text>
              <Text style={styles.subtitle}>
                Chúng tôi đã gửi liên kết khôi phục tới:{"\n"}
                <Text style={{ color: accentColor, fontWeight: '700' }}>{email}</Text>
              </Text>
              
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: accentColor, marginTop: 40 }]} 
                onPress={() => router.back()}
              >
                <Text style={styles.buttonText}>Quay lại Đăng nhập</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setIsSuccess(false)} style={{ marginTop: 20 }}>
                <Text style={{ color: theme.subtext, fontWeight: '600' }}>Thử lại với email khác</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // --- GIAO DIỆN NHẬP EMAIL ---
            <>
              <View style={styles.header}>
                <View style={[styles.logoCircle, { backgroundColor: 'rgba(142, 68, 173, 0.1)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={40} color={accentColor} />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Khôi phục mật khẩu</Text>
                <Text style={styles.subtitle}>
                  Đừng lo lắng! Hãy nhập email và chúng tôi sẽ giúp bạn lấy lại quyền truy cập ngay.
                </Text>
              </View>

              <View style={styles.form}>
                <View style={[
                  styles.inputWrapper, 
                  { backgroundColor: theme.inputBg },
                  focusedInput && { borderColor: accentColor, borderWidth: 1.5 }
                ]}>
                  <Ionicons name="mail-outline" size={20} color={focusedInput ? accentColor : "#999"} />
                  <TextInput
                    placeholder="Nhập email tài khoản của bạn"
                    placeholderTextColor="#999"
                    style={[styles.input, { color: theme.text }]}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedInput(true)}
                    onBlur={() => setFocusedInput(false)}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.mainButton, { backgroundColor: accentColor }]} 
                  onPress={onResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Gửi liên kết khôi phục</Text>
                      <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 60 : 20, 
    left: 10, 
    width: 44, 
    height: 44, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { 
    fontSize: 15, 
    color: '#8E8E93', 
    textAlign: 'center', 
    lineHeight: 22, 
    paddingHorizontal: 20, 
    marginTop: 10 
  },
  form: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  input: { flex: 1, height: '100%', fontSize: 16, marginLeft: 12 },
  mainButton: {
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8e44ad',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 200
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  successContainer: { alignItems: 'center', width: '100%' },
  successIconCircle: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});