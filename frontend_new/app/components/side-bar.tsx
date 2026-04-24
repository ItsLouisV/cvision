import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import * as Haptics from "expo-haptics"; // Thêm Haptics cho chuyên nghiệp
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface SidebarViewProps {
  onClose?: () => void;
}

const SidebarView = ({ onClose }: SidebarViewProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const { user } = useCurrentUser();

  // Lấy thông tin Role của người dùng hiện tại
  const { data: profile } = useQuery({
    queryKey: ['current_profile_role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });


  const isEmployer = profile?.role === 'employer';

  // Tạo danh sách Menu động dựa trên role
  const DYNAMIC_CATEGORIES = [
    { id: "1", title: "Dành cho bạn", icon: "heart-outline", path: "" },
    { id: "2", title: "Đang theo dõi", icon: "people-outline", path: "/following" },
    { 
      id: "3", 
      title: isEmployer ? "Quản lý ứng viên" : "Bài viết đã ứng tuyển", 
      icon: isEmployer ? "briefcase-outline" : "paper-plane-outline", 
      path: isEmployer ? "/employer/manage-candidates" : "/user/applied-jobs" 
    },
  ];

  // HÀM XỬ LÝ CHUYỂN TRANG & ĐÓNG DRAWER
  const handleNavigation = (path: string) => {
    // Tạo cảm giác vật lý khi nhấn
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Thực hiện đóng Drawer trước để giao diện mượt mà
    if (onClose) onClose();

    // Chuyển trang (dùng setTimeout một chút để Drawer kịp lướt đi)
    setTimeout(() => {
      router.push(path as any);
    }, 0);
  };

  const dynamicStyles = {
    container: { backgroundColor: isDark ? "#141414ff" : "#F2F2F7" },
    text: { color: theme.text },
    border: { borderColor: isDark ? "#333" : "#EEE" },
    card: { backgroundColor: isDark ? "#1A1A1A" : "#FFF" },
    subText: { color: isDark ? "#888" : "#AAA" },
  };

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Bảng feed</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={26} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="create-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => handleNavigation("/components/loved-posts")} // Cập nhật path đúng của Louis
            style={[styles.actionBox, dynamicStyles.border, dynamicStyles.card]}
          >
            <Ionicons name="heart-outline" size={28} color={theme.text} />
            {/* <Text style={[styles.actionLabel, dynamicStyles.text]}>Yêu thích</Text> */}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleNavigation("/components/saved-posts")} // Cập nhật path đúng của Louis
            style={[styles.actionBox, dynamicStyles.border, dynamicStyles.card]}
          >
            <Ionicons name="bookmark-outline" size={28} color={theme.text} />
            {/* <Text style={[styles.actionLabel, dynamicStyles.text]}>Đã lưu</Text> */}
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={[styles.section, { borderColor: isDark ? "#333" : "#EEE" }]}>
          {DYNAMIC_CATEGORIES.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavigation(item.path)} // 🎯 Bấm vào là đi đúng path
              style={[
                styles.categoryItem,
                index !== DYNAMIC_CATEGORIES.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: isDark ? "#333" : "#EEE",
                },
              ]}
            >
              <View style={styles.categoryLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon as any} size={22} color={theme.text} />
                </View>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>
                  {item.title}
                </Text>
              </View>

              <View style={styles.categoryRight}>
                <Ionicons name="chevron-forward" size={18} color={isDark ? "#555" : "#CCC"} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SidebarView;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 54,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", letterSpacing: -0.5 },
  headerIcons: { flexDirection: "row" },
  iconButton: { marginLeft: 15 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 10,
  },
  actionBox: {
    flex: 0.48,
    height: 60, // Tăng chiều cao để chứa text
    borderWidth: 1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  actionLabel: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  section: { borderWidth: 1, borderRadius: 22, overflow: "hidden" },
  categoryItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, paddingHorizontal: 18 },
  categoryLeft: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  categoryTitle: { fontSize: 16, fontWeight: "600", marginLeft: 10 },
  categoryRight: { flexDirection: "row", alignItems: "center" },
});