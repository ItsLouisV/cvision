import { ENV } from "@/config";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { CalendarRange } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

const JOB_TYPES = [
  { label: "Toàn thời gian", value: "full-time" },
  { label: "Bán thời gian", value: "part-time" },
  { label: "Hợp đồng", value: "contract" },
  { label: "Thực tập", value: "internship" },
  { label: "Freelance", value: "freelance" },
  { label: "Remote", value: "remote" },
];

const SALARY_UNITS = [
  { label: "Giờ", value: "hour" },
  { label: "Ngày", value: "day" },
  { label: "Tháng", value: "month" },
  { label: "Dự án", value: "project" },
  { label: "Thỏa thuận", value: "negotiable" },
  { label: "Năm", value: "year" },
];

const EditJobScreen = () => {
  const { id } = useLocalSearchParams(); // Lấy ID bài đăng cần sửa
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // States dữ liệu Form (Khởi tạo trống)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [location, setLocation] = useState("");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo, setSalaryTo] = useState("");
  const [category, setCategory] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("full-time");
  const [salaryUnit, setSalaryUnit] = useState("month");
  const [currency, setCurrency] = useState("VND");
  const [expiredAt, setExpiredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateMode, setDateMode] = useState<'date' | 'time'>('date');

  const isDark = colorScheme === "dark";
  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const borderColor = isDark ? "#333" : "#E5E5EA";
  const accentColor = "#8e44ad";

  useEffect(() => {
    if (id) fetchJobDetail();
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      setFetchingData(true);
      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title || "");
        setDescription(data.description || "");
        setRequirements(data.requirements || "");
        setLocation(data.location || "");
        setSalaryFrom(data.salary_from?.toString() || "");
        setSalaryTo(data.salary_to?.toString() || "");
        setCategory(data.category || "");
        setSelectedJobType(data.job_type || "full-time");
        setSalaryUnit(data.salary_unit || "month");
        setCurrency(data.currency || "VND");
        setExpiredAt(new Date(data.expired_at));
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin bài đăng.");
    } finally {
      setFetchingData(false);
    }
  };

  const handleUpdateJob = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Tiêu đề và Mô tả công việc.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        location: location.trim(),
        salary_from: Number(salaryFrom) || 0,
        salary_to: Number(salaryTo) || 0,
        salary_unit: salaryUnit,
        currency: currency,
        expired_at: expiredAt.toISOString(),
        category: category,
        job_type: selectedJobType,
        is_active: true, // Tự động kích hoạt lại nếu đang bị ẩn do hết hạn
        warning_sent: false
      };

      const { error } = await supabase
        .from("job_posts")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Cập nhật thành công',
        text2: 'Thông tin bài đăng đã được thay đổi.',
      });

      // Bắn event để các màn hình khác (như List hoặc Detail) cập nhật lại data
      DeviceEventEmitter.emit('job_updated');
      router.back();

    } catch (e) {
      console.error(e);
      Alert.alert("Lỗi", "Không thể cập nhật bài đăng.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) setExpiredAt(selectedDate);
  };

  if (fetchingData) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={{ marginTop: 10, color: theme.text }}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#000" : "#F2F2F7" }]} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* HEADER - Giống CreateJob nhưng là "Lưu" */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
          <Text style={[styles.navText, { color: accentColor }]}>Hủy</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sửa bài đăng</Text>
        <View style={styles.headerSide}>
          <TouchableOpacity
            onPress={handleUpdateJob}
            disabled={loading || !title.trim()}
            style={[styles.postBtn, { backgroundColor: accentColor, opacity: title.trim() && !loading ? 1 : 0.4 }]}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postBtnText}>Lưu</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* MAIN INFO CARD */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={styles.label}>TIÊU ĐỀ CÔNG VIỆC</Text>
            <TextInput
              placeholder="Ví dụ: Senior React Native Developer..."
              placeholderTextColor="#8E8E93"
              style={[styles.input, { color: theme.text }]}
              value={title}
              onChangeText={setTitle}
            />
            <View style={styles.divider} />
            <Text style={styles.label}>MÔ TẢ CÔNG VIỆC</Text>
            <TextInput
              placeholder="Nội dung công việc chính..."
              placeholderTextColor="#8E8E93"
              multiline
              style={[styles.textArea, { color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              scrollEnabled={false}
            />
            <View style={styles.divider} />
            <Text style={styles.label}>YÊU CẦU ỨNG VIÊN</Text>
            <TextInput
              placeholder="Kỹ năng, kinh nghiệm..."
              placeholderTextColor="#8E8E93"
              multiline
              style={[styles.textArea, { color: theme.text, minHeight: 80 }]}
              value={requirements}
              onChangeText={setRequirements}
              scrollEnabled={false}
            />
          </View>

          {/* JOB TYPE SECTION */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <Text style={styles.label}>LOẠI HÌNH CÔNG VIỆC</Text>
            <View style={styles.chipContainer}>
              {JOB_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setSelectedJobType(type.value)}
                  style={[
                    styles.chip,
                    { 
                        backgroundColor: selectedJobType === type.value ? accentColor : (isDark ? "#2C2C2E" : "#F2F2F7"), 
                        borderColor: borderColor 
                    }
                  ]}
                >
                  <Text style={[styles.chipText, { color: selectedJobType === type.value ? "#FFF" : (isDark ? "#EBEBF5" : "#3A3A3C") }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SALARY & LOCATION */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <Text style={styles.label}>MỨC LƯƠNG & ĐỊA ĐIỂM</Text>
            <View style={styles.rowItem}>
              <Ionicons name="cash-outline" size={20} color={accentColor} />
              <View style={styles.salaryContainer}>
                <TextInput
                  placeholder="Từ"
                  keyboardType="numeric"
                  style={[styles.salaryInput, { color: theme.text }]}
                  value={salaryFrom}
                  onChangeText={setSalaryFrom}
                />
                <Text style={{ color: "#8E8E93", marginHorizontal: 8 }}>-</Text>
                <TextInput
                  placeholder="Đến"
                  keyboardType="numeric"
                  style={[styles.salaryInput, { color: theme.text }]}
                  value={salaryTo}
                  onChangeText={setSalaryTo}
                />
                <TouchableOpacity 
                  onPress={() => setCurrency(prev => prev === "VND" ? "USD" : "VND")}
                  style={[styles.currencyPicker, { backgroundColor: isDark ? "#333" : "#eee" }]}
                >
                  <Text style={[styles.currencyText, { color: accentColor }]}>{currency}</Text>
                  <Ionicons name="chevron-down" size={12} color={accentColor} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.chipContainer, { marginTop: 12, paddingLeft: 32 }]}>
              {SALARY_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit.value}
                  onPress={() => setSalaryUnit(unit.value)}
                  style={[
                    styles.unitChip,
                    { 
                        backgroundColor: salaryUnit === unit.value ? `${accentColor}20` : "transparent",
                        borderColor: salaryUnit === unit.value ? accentColor : borderColor 
                    }
                  ]}
                >
                  <Text style={[styles.unitChipText, { color: salaryUnit === unit.value ? accentColor : "#8E8E93" }]}>
                    / {unit.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.divider} />
            <View style={styles.rowItem}>
              <Ionicons name="location-outline" size={20} color={accentColor} />
              <TextInput
                placeholder="Địa điểm làm việc..."
                placeholderTextColor="#8E8E93"
                style={[styles.flexInput, { color: theme.text }]}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* EXPIRED DATE PICKER */}
          <View style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}>
            <View style={styles.rowItem}>
              <Ionicons name="calendar-outline" size={20} color={accentColor} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 13, color: "#8E8E93" }}>Gia hạn bài đăng</Text>
                <Text style={{ fontSize: 16, color: theme.text, fontWeight: "500" }}>
                  {expiredAt.toLocaleString("vi-VN")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setDateMode('date'); setShowDatePicker(true); }}
                style={{marginRight: 5, padding: 8, backgroundColor: isDark ? '#333' : '#eee', borderRadius: 8 }}
              >
                <CalendarRange size={16} color={accentColor} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={expiredAt}
                style={{ marginLeft: 15 }}
                mode={dateMode}
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={onDateChange}
                textColor={isDark ? "#FFF" : "#000"}
              />
            )}
          </View>

          <Text style={styles.footerNote}>* Cập nhật thông tin sẽ giúp AI Louis phân loại ứng viên chính xác hơn.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 25, height: 56, borderBottomWidth: 0.5 },
  headerSide: { minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  navText: { fontSize: 17 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 16, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  label: { fontSize: 11, fontWeight: "700", color: "#8E8E93", marginBottom: 12, letterSpacing: 0.5 },
  input: { fontSize: 18, fontWeight: "600", paddingVertical: 10 },
  textArea: { fontSize: 16, minHeight: 100, textAlignVertical: "top", paddingTop: 8, lineHeight: 22 },
  divider: { height: 0.5, width: "100%", backgroundColor: "#E5E5EA", marginVertical: 15 },
  rowItem: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  flexInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  salaryContainer: { flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 12 },
  salaryInput: { fontSize: 16, flex: 1, fontWeight: "500" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
  unitChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  unitChipText: { fontSize: 12, fontWeight: "700" },
  currencyPicker: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 5 },
  currencyText: { fontSize: 14, fontWeight: "700", marginRight: 2 },
  footerNote: { textAlign: "center", color: "#8E8E93", fontSize: 12, marginTop: 20, paddingHorizontal: 20 },
});

export default EditJobScreen;