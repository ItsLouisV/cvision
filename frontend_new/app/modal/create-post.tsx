import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

const { width } = Dimensions.get('window');

const CreateJobPost = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(false);
  const [fetchingEmployer, setFetchingEmployer] = useState(true);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [isValidEmployer, setIsValidEmployer] = useState(false);
  
  // States quản lý dữ liệu khớp với Backend Python của Louis
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [salaryFrom, setSalaryFrom] = useState('');
  const [salaryTo, setSalaryTo] = useState('');

  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const borderColor = isDark ? '#333' : '#E5E5EA';
  const accentColor = '#8e44ad'; // Màu tím đặc trưng cho AI

  useEffect(() => {
    const initScreen = async () => {
      try {
        setFetchingEmployer(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // Nếu KHÔNG PHẢI employer, hiện thông báo và đá ra ngoài ngay
        if (profile?.role !== 'employer') {
          Alert.alert(
            "Quyền truy cập hạn chế",
            "Chỉ tài khoản Nhà tuyển dụng mới có thể sử dụng tính năng đăng tin này.",
            [
              { 
                text: "Đã hiểu", 
                onPress: () => router.back() // TỰ ĐỘNG ĐÓNG MÀN HÌNH TẠI ĐÂY
              }
            ],
            { cancelable: false } // Bắt buộc phải bấm "Đã hiểu"
          );
          return;
        }

        const { data: employerData, error: empError } = await supabase
          .from('employers')
          .select('id, company_name, address, contact_email')
          .eq('user_id', user.id)
          .single();

        if ( empError || !employerData || !employerData.company_name || !employerData.address || !employerData.contact_email) {
          Alert.alert(
            "Thông tin công ty thiếu",
            "Bạn cần cập nhật thông tin công ty trước khi đăng tin.",
            [
              { 
                text: "Cập nhật ngay", 
                onPress: () => {
                  router.back();
                  
                  setTimeout(() => {
                    router.push('/settings/company/edit') 
                  }, 100);
                } 
              },
              { 
                text: "Để sau", 
                onPress: () => router.back() 
              }
            ],
          );
          return;
        }
        
        setEmployerId(employerData.id);
        setIsValidEmployer(true);
      } catch (error) {
        console.error("init error:", error);
      } finally {
        setFetchingEmployer(false);
      }
    };

    initScreen();
  }, []);

  const handlePostJob = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Tiêu đề và Mô tả công việc.");
      return;
    }

    setLoading(true);
    try {
      // Kết nối trực tiếp tới Backend Python của Louis
      const response = await axios.post('http://192.168.1.138:8081/api/v1/jobs/create', {
        employer_id: employerId,
        title,
        description,
        requirements,
        location,
        salary_from: parseFloat(salaryFrom) || 0,
        salary_to: parseFloat(salaryTo) || 0,
        job_type: "Full-time"
      });

      if (response.data.success) {
        Alert.alert("Thành công", "Bài đăng đã được đăng tải.");
        router.back();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể kết nối tới Backend AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* iOS MODAL HANDLE */}
      <View style={styles.modalHandleWrapper}>
        <View style={[styles.modalHandle, { backgroundColor: isDark ? '#333' : '#C7C7CC' }]} />
      </View>

      {/* HEADER KIỂU IOS */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text style={[styles.navText, { color: accentColor }]}>Hủy</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Đăng tin mới</Text>
        
        <View style={styles.headerSide}>
          <TouchableOpacity 
            onPress={handlePostJob}
            disabled={loading || !title.trim()} 
            style={[
              styles.postBtn, 
              { 
                backgroundColor: accentColor,
                opacity: (title.trim() && !loading) ? 1 : 0.4 
              }
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Đăng</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* AI ASSISTANCE BANNER */}
          <View style={[styles.aiBanner, { backgroundColor: isDark ? '#1a1025' : '#f3ebff' }]}>
            <Ionicons name="sparkles" size={18} color={accentColor} />
            <Text style={[styles.aiText, { color: isDark ? '#d4b0ff' : '#6a1b9a' }]}>
              Gemini AI sẽ phân tích nội dung này để gợi ý ứng viên phù hợp nhất.
            </Text>
          </View>

          {/* NHÓM THÔNG TIN CHÍNH */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={styles.label}>TIÊU ĐỀ CÔNG VIỆC</Text>
            <TextInput
              placeholder="Ví dụ: Lập trình viên React Native..."
              placeholderTextColor="#8E8E93"
              style={[styles.input, { color: theme.text }]}
              value={title}
              onChangeText={setTitle}
            />
            
            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            <Text style={styles.label}>MÔ TẢ VÀ YÊU CẦU</Text>
            <TextInput
              placeholder="Nội dung công việc, yêu cầu kỹ năng..."
              placeholderTextColor="#8E8E93"
              multiline
              style={[styles.textArea, { color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              scrollEnabled={false}
            />
          </View>

          {/* NHÓM THÔNG TIN CHI TIẾT */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20, marginBottom: 50 }]}>
            <View style={styles.rowItem}>
              <Ionicons name="location-outline" size={20} color={accentColor} />
              <TextInput
                placeholder="Địa điểm làm việc cụ thể"
                placeholderTextColor="#8E8E93"
                style={[styles.flexInput, { color: theme.text }]}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <Text style={styles.label}>MỨC LƯƠNG</Text>

            <View style={styles.rowItem}>
              <Ionicons name="cash-outline" size={20} color={accentColor} />
              <View style={styles.salaryContainer}>
                <TextInput
                  placeholder="From"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  style={[styles.salaryInput, { color: theme.text }]}
                  value={salaryFrom}
                  onChangeText={setSalaryFrom}
                />
                <Text style={{ color: '#8E8E93', marginHorizontal: 10 }}>-</Text>
                <TextInput
                  placeholder="To"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  style={[styles.salaryInput, { color: theme.text }]}
                  value={salaryTo}
                  onChangeText={setSalaryTo}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  modalHandleWrapper: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  modalHandle: { width: 36, height: 5, borderRadius: 2.5 },
  container: { flex: 1},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 54,
    borderBottomWidth: 0.5,
  },
  headerSide: { minWidth: 60, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  navText: { fontSize: 17, fontWeight: '400' },
  postBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    alignSelf: 'flex-end',
  },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  aiBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  aiText: { fontSize: 13, marginLeft: 8, flex: 1, fontWeight: '500' },
  card: {
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '600', color: '#8E8E93', marginBottom: 10, letterSpacing: 0.5 },
  input: { fontSize: 17, fontWeight: '500', paddingVertical: 8 },
  textArea: { fontSize: 16, minHeight: 100, textAlignVertical: 'top', paddingTop: 8 },
  divider: { height: 0.5, width: '100%', marginVertical: 12 },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  flexInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  salaryContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  salaryInput: { fontSize: 16, flex: 1 },
});

export default CreateJobPost;