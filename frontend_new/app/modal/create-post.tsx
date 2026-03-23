import { ENV } from "@/config";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { CalendarRange } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useRouter, Stack, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import CurrencyInput from 'react-native-currency-input';
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

// Danh sách loại hình công việc
const JOB_TYPES = [
  { label: "Toàn thời gian", value: "full-time" },
  { label: "Bán thời gian", value: "part-time" },
  { label: "Hợp đồng", value: "contract" },
  { label: "Thực tập", value: "internship" },
  { label: "Freelance", value: "freelance" },
  { label: "Remote", value: "remote" },
];

// Định nghĩa danh sách đơn vị lương
const SALARY_UNITS = [
  { label: "Giờ", value: "hour" },
  { label: "Ngày", value: "day" },
  { label: "Tháng", value: "month" },
  { label: "Dự án", value: "project" },
  { label: "Thỏa thuận", value: "negotiable" },
  { label: "Năm", value: "year" },
];

const CreateJobPost = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(false); // Can be used to disable the button, but we won't block the screen
  const [fetchingEmployer, setFetchingEmployer] = useState(true);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");

  // States dữ liệu Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [location, setLocation] = useState("");
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo, setSalaryTo] = useState("");
  const [category, setCategory] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("full-time"); // Mặc định
  const [salaryUnit, setSalaryUnit] = useState("month"); // Mặc định
  const [currency, setCurrency] = useState("VND"); // Mặc định là VND

  // State quản lý ngày hết hạn
  const [expiredAt, setExpiredAt] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Cộng 30 ngày
    date.setHours(23, 59, 0, 0);       // Đưa về cuối ngày cho đẹp
    return date;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [dateMode, setDateMode] = useState<'date' | 'time'>('date');

  const isDark = colorScheme === "dark";
  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const borderColor = isDark ? "#333" : "#E5E5EA";
  const accentColor = "#8e44ad";

  useEffect(() => {
    const initScreen = async () => {
      try {
        setFetchingEmployer(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "employer") {
          Alert.alert(
            "Quyền truy cập bị hạn chế",
            "Chỉ Nhà tuyển dụng mới có thể sử dụng tính năng này.",
            [{ text: "Đã hiểu", onPress: () => router.back() }],
          );
          return;
        }

        const { data: employerData, error: empError } = await supabase
          .from("employers")
          .select("id, company_name")
          .eq("user_id", user.id)
          .single();

        if (empError || !employerData?.company_name) {
          Alert.alert(
            "Thông tin thiếu",
            "Vui lòng cập nhật hồ sơ công ty trước.",
            [
              {
                text: "Cập nhật",

                onPress: () => {
                  router.back();
                  router.push("/settings/company/edit");
                }
              },
            ],
          );
          return;
        }

        setEmployerId(employerData.id);
        setCompanyName(employerData.company_name);
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setFetchingEmployer(false);
      }
    };
    initScreen();
  }, []);

  // Logic tự động gợi ý đơn vị lương theo loại hình
  useEffect(() => {
    if (selectedJobType === "part-time") setSalaryUnit("hour");
    else if (selectedJobType === "freelance") setSalaryUnit("project");
    else setSalaryUnit("month");
  }, [selectedJobType]);

  const handlePostJob = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // Kiểm tra user tồn tại
      if (userError || !user) {
        Alert.alert("Lỗi", "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      if (!title.trim() || !description.trim()) {
        Alert.alert(
          "Thiếu thông tin",
          "Vui lòng nhập Tiêu đề và Mô tả công việc.",
        );
        return;
      }

      if (expiredAt <= new Date()) {
        Alert.alert(
          "Lỗi ngày tháng",
          "Hạn chót đăng bài phải sau thời điểm hiện tại.",
        );
        return;
      }

      setLoading(true);

      const payload = {
        employer_id: employerId,
        user_id: user.id,
        company_name: companyName,
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
      };

      console.log("Sending Payload:", payload);
      
      // Emit event báo hiệu quá trình bắt đầu tải lên và đóng modal
      DeviceEventEmitter.emit('create_post_start');
      router.back();

      // Gọi API ở background (không await để chặn modal)
      axios.post(`${ENV.API_URL}/jobs/create`, payload).then((response) => {
        if (response.data.success) {
          Toast.show({
            type: 'success',
            text1: 'Thành công',
            text2: 'Tin tuyển dụng đã được AI xử lý và đăng tải.',
            visibilityTime: 2500,
            autoHide: true,
          });
          // Emit event báo hiệu tải lên thành công để trang chủ tự load lại
          DeviceEventEmitter.emit('create_post_success');
        }
      }).catch((error) => {
        if (error.response?.status === 422) {
          DeviceEventEmitter.emit('create_post_error', "Dữ liệu gửi lên không đúng định dạng AI yêu cầu.");
        } else {
          DeviceEventEmitter.emit('create_post_error', "Không thể kết nối tới máy chủ AI.");
        }
      });

    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };
  // Hàm xử lý DatePicker để không bị đóng đột ngột
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) {
        // Nếu đang ở mode date, lưu ngày rồi hỏi tiếp giờ (nếu muốn chi tiết)
        // Hoặc đơn giản là cập nhật luôn
        setExpiredAt(selectedDate);
      }
    } else {
      if (selectedDate) setExpiredAt(selectedDate);
    }
  };

  if (fetchingEmployer) {
    return (
      <View
        style={[
          styles.loadingCenter,
          { backgroundColor: isDark ? "#000" : "#F2F2F7" },
        ]}
      >
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? "#000" : "#F2F2F7" },
      ]}
      edges={["top"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerSide}
        >
          <Text style={[styles.navText, { color: accentColor }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          New Post
        </Text>
        <View style={styles.headerSide}>
          <TouchableOpacity
            onPress={handlePostJob}
            disabled={loading || !title.trim()}
            style={[
              styles.postBtn,
              {
                backgroundColor: accentColor,
                opacity: title.trim() && !loading ? 1 : 0.4,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* AI BANNER */}
          <View
            style={[
              styles.aiBanner,
              { backgroundColor: isDark ? "#1a1025" : "#f3ebff" },
            ]}
          >
            <Ionicons name="sparkles" size={18} color={accentColor} />
            <Text
              style={[styles.aiText, { color: isDark ? "#d4b0ff" : "#6a1b9a" }]}
            >
              Louis AI sẽ giúp bạn tiếp cận ứng viên có kỹ năng phù hợp nhất.
            </Text>
          </View>

          {/* MAIN INFO */}
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
              placeholder="Kỹ năng, kinh nghiệm, bằng cấp cần có..."
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
                    { backgroundColor: selectedJobType === type.value ? accentColor : (isDark ? "#2C2C2E" : "#F2F2F7"), borderColor: borderColor }
                  ]}
                >
                  <Text style={[styles.chipText, { color: selectedJobType === type.value ? "#FFF" : (isDark ? "#EBEBF5" : "#3A3A3C") }]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* DETAILS CARD */}
          <View
            style={[styles.card, { backgroundColor: cardBg, marginTop: 20 }]}
          >
            <Text style={styles.label}>MỨC LƯƠNG & ĐỊA ĐIỂM</Text>
            <View style={styles.rowItem}>
              <Ionicons name="cash-outline" size={20} color={accentColor} />
              <View style={styles.salaryContainer}>
                <CurrencyInput
                  placeholder="Từ"
                  keyboardType="numeric"
                  style={[styles.salaryInput, { color: theme.text }]}
                  value={Number(salaryFrom)}
                  onChangeValue={(val) => setSalaryFrom(val?.toString() || "0")}
                  prefix={currency === "USD" ? "$" : ""}
                  suffix={currency === "VND" ? "đ" : ""}
                  delimiter={currency === "USD" ? "," : "."}
                  separator={currency === "USD" ? "." : ","}
                  precision={currency === "USD" ? 1 : 0}
                />
                <Text style={{ color: "#8E8E93", marginHorizontal: 8 }}>-</Text>
                <CurrencyInput
                  placeholder="Đến"
                  keyboardType="numeric"
                  style={[styles.salaryInput, { color: theme.text }]}
                  value={Number(salaryTo)}
                  onChangeValue={(val) => setSalaryTo(val?.toString() || "0")}
                  prefix={currency === "USD" ? "$" : ""}
                  suffix={currency === "VND" ? "đ" : ""}
                  delimiter={currency === "USD" ? "," : "."}
                  separator={currency === "USD" ? "." : ","}
                  precision={currency === "USD" ? 1 : 0}
                />
                {/* Nút chuyển đổi tiền tệ */}
                <TouchableOpacity 
                  onPress={() => setCurrency(prev => prev === "VND" ? "USD" : "VND")}
                  style={[styles.currencyPicker, { backgroundColor: isDark ? "#333" : "#eee" }]}
                >
                  <Text style={[styles.currencyText, { color: accentColor }]}>{currency}</Text>
                  <Ionicons name="chevron-down" size={12} color={accentColor} />
                </TouchableOpacity>
              </View>
            </View>

            {/* UNIT SELECTION CHIPS */}
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
                placeholder="Địa điểm làm việc (Vd: Quận 1, TP.HCM)"
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
                <Text style={{ fontSize: 13, color: "#8E8E93" }}>
                  Hạn chót bài đăng
                </Text>
                <Text
                  style={{ fontSize: 16, color: theme.text, fontWeight: "500" }}
                >
                  {expiredAt.toLocaleString("vi-VN", {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDateMode('date');
                  setShowDatePicker(true);
                }}
                style={{marginRight: 5, padding: 8, backgroundColor: isDark ? '#333' : '#eee', borderRadius: 8 }}
              >
                <CalendarRange size={16} color={accentColor} />
              </TouchableOpacity>
              {/* Thêm một nút nhỏ để chuyển sang chọn GIỜ nhanh */}
              <TouchableOpacity 
                onPress={() => {
                    setDateMode('time');
                    setShowDatePicker(true);
                }}
                style={{ padding: 4.5, backgroundColor: isDark ? '#333' : '#eee', borderRadius: 8 }}
              >
                <Ionicons name="time-outline" size={23} color={accentColor} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={{ marginTop: 10 }}>
                <DateTimePicker
                  style={{marginLeft: 20}}
                  value={expiredAt}
                  mode={dateMode}
                  minimumDate={new Date()}
                  display={Platform.OS === "ios" ? "spinner" : "calendar"}
                  onChange={onDateChange}
                  textColor={isDark ? "#FFF" : "#000"}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.doneBtn}
                  >
                    <Text style={styles.doneBtnText}>Xong</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <Text style={styles.footerNote}>
            * Sau ngày này, tin tuyển dụng sẽ tự động ẩn khỏi danh sách tìm kiếm
            của ứng viên.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    height: 56,
    borderBottomWidth: 0.5,
  },
  headerSide: { minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  navText: { fontSize: 17 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  aiBanner: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  aiText: {
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    fontWeight: "500",
    lineHeight: 18,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8E8E93",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  input: { fontSize: 18, fontWeight: "600", paddingVertical: 10 },
  textArea: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 8,
    lineHeight: 22,
  },
  divider: {
    height: 0.5,
    width: "100%",
    backgroundColor: "#E5E5EA",
    marginVertical: 15,
  },
  rowItem: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  flexInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  salaryContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  salaryInput: { fontSize: 16, flex: 1, fontWeight: "500" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  unitChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  unitChipText: { fontSize: 12, fontWeight: "700" },
  doneBtn: { alignSelf: "center", marginTop: 5, padding: 10 },
  doneBtnText: { color: "#8e44ad", fontWeight: "bold", fontSize: 16 },
  currencyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 5,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 2,
  },
  footerNote: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
});

export default CreateJobPost;
