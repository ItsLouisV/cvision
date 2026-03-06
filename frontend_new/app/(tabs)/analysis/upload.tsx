import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ActivityIndicator, Alert, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

const { width } = Dimensions.get('window');

export default function UploadCVScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // Khai báo state để lưu thông tin user
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const IP_ADDRESS = '[IP_ADDRESS]';

  // Hàm lấy thông tin user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
     if (user) {
      setUser(user);
     } else {
      Alert.alert('Vui lòng đăng nhập để sử dụng tính năng này');
      router.replace('/login');
     }
    };
    getUser();

    // Sau này làm tài khoản premium.

    // const checkPremium = async () => {
    //   const { data: { user } } = await supabase.auth.getUser();
    //   if (user) {
    //     const { data, error } = await supabase
    //       .from('profiles')
    //       .select('is_premium')
    //       .eq('id', user.id)
    //       .single();

    //     if (data) {
    //       setIsPremium(data.is_premium);
    //     }
    //   }
    // };
    // checkPremium();
  }, []);

  // 1. Hàm chọn File từ điện thoại
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chọn tài liệu');
    }
  };

  // 2. Hàm gửi File lên FastAPI
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf',
      });

      // Thay IP máy tính Louis ở đây
      // Trong file upload.tsx (Mobile)
        const response = await axios.post(`http://[IP_ADDRESS]/cv/upload?user_id=${user?.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        Alert.alert('Thành công', 'AI đã phân tích xong CV của bạn!');
        router.replace('/(tabs)/analysis'); // Quay lại trang phân tích
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể tải CV lên server. Hãy kiểm tra kết nối Backend!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Tải lên CV</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Tải lên bản PDF để AI bắt đầu phân tích kỹ năng và kinh nghiệm của bạn.
          </Text>

          {/* DROPZONE AREA */}
          <TouchableOpacity 
            style={[
              styles.dropzone, 
              { 
                borderColor: selectedFile ? accentColor : '#D1D1D6',
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' 
              }
            ]}
            onPress={pickDocument}
          >
            <LinearGradient
              colors={selectedFile ? ['rgba(142, 68, 173, 0.1)', 'transparent'] : ['transparent', 'transparent']}
              style={styles.gradientBg}
            >
              <Ionicons 
                name={selectedFile ? "document-text" : "cloud-upload-outline"} 
                size={64} 
                color={selectedFile ? accentColor : '#AEAEB2'} 
              />
              <Text style={[styles.dropzoneText, { color: theme.text }]}>
                {selectedFile ? selectedFile.name : 'Nhấn để chọn file PDF'}
              </Text>
              {selectedFile && (
                <Text style={styles.fileSize}>
                  {(selectedFile.size! / (1024 * 1024)).toFixed(2)} MB
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Hướng dẫn */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>Chỉ hỗ trợ định dạng .PDF (Tối đa 5MB)</Text>
          </View>

          {/* Nút Upload */}
          <TouchableOpacity 
            style={[
              styles.uploadBtn, 
              { backgroundColor: selectedFile && !uploading ? accentColor : '#AEAEB2' }
            ]}
            disabled={!selectedFile || uploading}
            onPress={handleUpload}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.uploadBtnText}>Phân tích CV</Text>
                <Ionicons name="sparkles" size={18} color="#fff" style={{marginLeft: 8}} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 60 
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', marginLeft: 10 },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  subtitle: { 
    textAlign: 'center', 
    color: '#8E8E93', 
    fontSize: 15, 
    lineHeight: 22,
    marginBottom: 40 
  },
  dropzone: {
    width: '100%',
    height: 250,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  gradientBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  dropzoneText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  fileSize: {
    marginTop: 8,
    color: '#8E8E93',
    fontSize: 12
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: '100%'
  },
  infoText: {
    color: '#8E8E93',
    fontSize: 13,
    marginLeft: 8
  },
  uploadBtn: {
    position: 'absolute',
    bottom: 40,
    width: width - 48,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700'
  }
});