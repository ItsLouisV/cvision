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

const SAVED_CATEGORIES = [
  { id: "1", title: "Dành cho bạn", icon: "heart-outline", count: 12 },
  { id: "2", title: "Đang theo dõi", icon: "people-outline", count: 45 },
  { id: "3", title: "Bài viết tự hủy", icon: "flash-outline", count: 5 },
];

interface SidebarViewProps {
  onClose?: () => void;
}

const SidebarView = ({ onClose }: SidebarViewProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    text: { color: theme.text },
    border: { borderColor: colorScheme === "dark" ? "#333" : "#EEE" },
    card: { backgroundColor: colorScheme === "dark" ? "#1A1A1A" : "#FFF" },
    subText: { color: colorScheme === "dark" ? "#888" : "#AAA" },
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

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionBox, dynamicStyles.border, dynamicStyles.card]}
          >
            <Ionicons name="heart-outline" size={28} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBox, dynamicStyles.border, dynamicStyles.card]}
          >
            <Ionicons name="bookmark-outline" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={[styles.section, dynamicStyles.border]}>
          {SAVED_CATEGORIES.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.categoryItem,
                index !== SAVED_CATEGORIES.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: dynamicStyles.border.borderColor,
                },
              ]}
            >
              <View style={styles.categoryLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={theme.text}
                  />
                </View>
                <Text style={[styles.categoryTitle, dynamicStyles.text]}>
                  {item.title}
                </Text>
              </View>

              <View style={styles.categoryRight}>
                {item.id === "3" && (
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={20}
                    color={dynamicStyles.subText.color}
                    style={{ marginRight: 10 }}
                  />
                )}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colorScheme === "dark" ? "#555" : "#CCC"}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty state */}
        <View style={styles.emptyState}>
          <Ionicons
            name="albums-outline"
            size={48}
            color={colorScheme === "dark" ? "#222" : "#EEE"}
          />
          <Text style={[styles.emptyText, dynamicStyles.subText]}>
            Chưa có nội dung lưu mới nào khác
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SidebarView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 54,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: "row",
  },
  iconButton: {
    marginLeft: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 10,
  },
  actionBox: {
    flex: 0.48,
    height: 64,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  section: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
});
