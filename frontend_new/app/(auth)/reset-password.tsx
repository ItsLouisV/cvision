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
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
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

  const url = Linking.useLinkingURL();

  // LOGIC XỬ LÝ TOKEN TỪ URL (GIỮ NGUYÊN VÌ RẤT QUAN TRỌNG)
  useEffect(() => {
    const setSessionFromUrl = async () => {
      if (url) {
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
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) console.log("❌ Lỗi thiết lập session:", error.message);
          else console.log("✅ Đã xác thực người dùng thành công qua link!");
        }
      }
    };
    setSessionFromUrl();
  }, [url]);

  const onUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ mật khẩu mới nhé!');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi khớp mật khẩu', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu cần ít nhất 6 ký tự để bảo mật.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      Alert.alert('Lỗi cập nhật', error.message);
    } else {
      Toast.show({
        type: 'success',
        text1: 'Thành công!',
        text2: 'Mật khẩu đã được đổi. Đang quay lại trang chủ...',
      });
      setTimeout(() => {
        router.replace('../(tabs)/home');
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        
        {/* NÚT ĐÓNG (THAY VÌ BACK VÌ ĐÂY LÀ FLOW ĐẶC BIỆT) */}
        <TouchableOpacity 
          style={[styles.closeBtn, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.inner}>
          
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: 'rgba(142, 68, 173, 0.1)' }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={44} color={accentColor} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Mật khẩu mới</Text>
            <Text style={styles.subtitle}>
              Hãy chọn một mật khẩu mạnh để bảo vệ tài khoản của mình nhé.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Ô NHẬP MẬT KHẨU MỚI */}
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: theme.inputBg },
              focusedInput === 'pass' && { borderColor: accentColor, borderWidth: 1.5 }
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedInput === 'pass' ? accentColor : "#999"} />
              <TextInput
                placeholder="Mật khẩu mới"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                onFocus={() => setFocusedInput('pass')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Ô XÁC NHẬN MẬT KHẨU */}
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: theme.inputBg },
              focusedInput === 'confirm' && { borderColor: accentColor, borderWidth: 1.5 }
            ]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={focusedInput === 'confirm' ? accentColor : "#999"} />
              <TextInput
                placeholder="Xác nhận mật khẩu mới"
                placeholderTextColor="#999"
                style={[styles.input, { color: theme.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!isConfirmVisible}
                onFocus={() => setFocusedInput('confirm')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity onPress={() => setIsConfirmVisible(!isConfirmVisible)}>
                <Ionicons name={isConfirmVisible ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: accentColor }]} 
              onPress={onUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  closeBtn: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 60 : 20, 
    right: 24, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
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
    width: 84, 
    height: 84, 
    borderRadius: 26, 
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
    paddingHorizontal: 15, 
    marginTop: 10 
  },
  form: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
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
    marginTop: 10
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});