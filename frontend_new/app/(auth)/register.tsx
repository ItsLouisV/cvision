import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

// Khai báo kiểu vai trò dựa trên Enum của bạn
type UserRole = 'candidate' | 'employer';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('candidate'); // Mặc định là ứng viên
  const [loading, setLoading] = useState(false);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const onRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role, // LƯU VAI TRÒ VÀO METADATA
        }
      }
    });

    if (error) {
      Alert.alert('Lỗi đăng ký', error.message);
      setLoading(false);
      return;
    }

    if (data.session === null) {
      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: `Chào ${fullName}! Vui lòng đăng nhập để tiếp tục.`
      });
      router.back();
    } else {
      router.replace('../(tabs)/home');
    }
    setLoading(false);
  };

  const RoleOption = ({ type, label, icon }: { type: UserRole, label: string, icon: any }) => {
    const isSelected = role === type;
    return (
      <TouchableOpacity 
        style={[
          styles.roleCard, 
          { backgroundColor: isDark ? '#111' : '#fff', borderColor: isSelected ? accentColor : 'transparent' }
        ]} 
        onPress={() => setRole(type)}
      >
        <Ionicons name={icon} size={24} color={isSelected ? accentColor : '#8E8E93'} />
        <Text style={[styles.roleLabel, { color: isSelected ? accentColor : '#8E8E93' }]}>{label}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color={accentColor} style={styles.checkIcon} />}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color={accentColor} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Tạo tài khoản</Text>
        <Text style={styles.subtitle}>Chọn vai trò của bạn để bắt đầu</Text>
      </View>

      <View style={styles.roleContainer}>
        <RoleOption type="candidate" label="Người tìm việc" icon="person-outline" />
        <RoleOption type="employer" label="Nhà tuyển dụng" icon="business-outline" />
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Họ và tên"
          placeholderTextColor="#666"
          style={[styles.input, { backgroundColor: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000' }]}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor="#666"
          style={[styles.input, { backgroundColor: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000' }]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Mật khẩu"
          placeholderTextColor="#666"
          style={[styles.input, { backgroundColor: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000' }]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          placeholder="Xác nhận mật khẩu"
          placeholderTextColor="#666"
          style={[styles.input, { backgroundColor: isDark ? '#111' : '#fff', color: isDark ? '#fff' : '#000' }]}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentColor }]} 
          onPress={onRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng ký ngay</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()} style={styles.footerLink}>
        <Text style={styles.linkText}>Có tài khoản rồi à? <Text style={{ color: accentColor, fontWeight: '700' }}>Đăng nhập</Text> đi nè!</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  backBtn: { marginTop: 40, marginLeft: -10 },
  header: { marginTop: 20, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  roleCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative'
  },
  roleLabel: { marginTop: 8, fontSize: 14, fontWeight: '700' },
  checkIcon: { position: 'absolute', top: 8, right: 8 },
  form: { width: '100%' },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 68, 173, 0.1)',
  },
  button: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footerLink: { marginTop: 32, marginBottom: 50, alignItems: 'center' },
  linkText: { color: '#666', fontSize: 15 },
});