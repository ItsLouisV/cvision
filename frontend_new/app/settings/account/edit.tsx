import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function AccountEditScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useCurrentUser();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };


  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      return newStatus === 'granted';
    }
    return true;
  };

  // 🔥 Logic Chọn và Upload Ảnh
  const pickImage = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) {
      Alert.alert("Lỗi", "Cần quyền truy cập thư viện ảnh để chọn ảnh.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  // 2. Logic upload mới không dùng Base64 string
  const uploadAvatar = async (uri: string) => {
    setUploading(true);
    try {
      if (!user) return;

      // Đọc file dưới dạng mảng byte (ArrayBuffer) trực tiếp
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const filePath = `${user.id}/${Date.now()}.png`;

      // Upload trực tiếp ArrayBuffer lên Supabase
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, { 
          contentType: 'image/png',
          upsert: true 
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
      
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể tải ảnh lên theo chuẩn mới.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
  if (!fullName.trim()) return Alert.alert("Lỗi", "Vui lòng nhập họ tên.");
  setSaving(true);
  
  try {
    if (!user) throw new Error("Không tìm thấy user");

    console.log("Đang lưu link ảnh:", avatarUrl); 

    // Lệnh chuẩn: Không để upsert bên trong object dữ liệu
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        full_name: fullName, 
        phone: phone,
        avatar_url: avatarUrl, // Link ảnh từ Storage
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id); 
    
    if (error) throw error;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  } catch (e: any) { 
    console.error("Lỗi chi tiết:", e.message);
    Alert.alert("Lỗi", "Không thể cập nhật thông tin: " + e.message); 
  } finally { 
    setSaving(false); 
  }
};

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F2F2F7' }}>
      <SafeAreaView edges={['top']} style={[styles.headerContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Sửa hồ sơ</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || uploading}>
            {saving ? <ActivityIndicator size="small" color="#8e44ad" /> : <Text style={styles.editLabel}>Lưu</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          
          {/* PHẦN CHỈNH SỬA AVATAR */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} disabled={uploading}>
              <Image 
                source={{ uri: avatarUrl || 'https://ui-avatars.com/api/?name=' + fullName }} 
                style={[styles.avatarImage, { opacity: uploading ? 0.5 : 1 }]} 
              />
              {uploading ? (
                <View style={styles.loaderOverlay}><ActivityIndicator color="#FFF" /></View>
              ) : (
                <View style={styles.cameraBadge}><Ionicons name="camera" size={18} color="#FFF" /></View>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Chạm để đổi ảnh đại diện</Text>
          </View>

          {/* FORM NHẬP LIỆU */}
          <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
            <Text style={styles.label}>HỌ VÀ TÊN</Text>
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              value={fullName} 
              onChangeText={setFullName} 
              placeholder="Nhập tên..." 
              placeholderTextColor="#8E8E93" 
            />
            <View style={styles.divider} />
            <Text style={styles.label}>SỐ ĐIỆN THOẠI</Text>
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="09xxx..." 
              keyboardType="phone-pad" 
              placeholderTextColor="#8E8E93" 
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  editLabel: { color: '#8e44ad', fontWeight: '600', fontSize: 16 },
  
  avatarContainer: { alignItems: 'center', marginVertical: 20 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#FFF' },
  loaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8e44ad', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#F2F2F7' },
  avatarHint: { marginTop: 12, fontSize: 13, color: '#8E8E93' },

  card: { borderRadius: 24, padding: 20 },
  label: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginBottom: 8 },
  input: { fontSize: 17, paddingVertical: 8 },
  divider: { height: 0.4, backgroundColor: '#757576ff', marginVertical: 12 }
});