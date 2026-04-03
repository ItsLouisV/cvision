import React from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EyeOff, Flag, Link2, Share2 } from "lucide-react-native";

interface PostMenuProps {
  visible: boolean;
  onClose: () => void;
  post: any;
  theme: any;
  isDark: boolean;
  onAction: (action: string) => void;
}

export const PostMenu = ({
  visible,
  onClose,
  post,
  theme,
  isDark,
  onAction,
}: PostMenuProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.menuSheet,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
          onPress={() => {}}
        >
          {/* Drag handle */}
          <View style={styles.menuHandle} />

          {post && (
            <View style={styles.menuPostPreview}>
              <Image
                source={{ uri: post.userAvatar }}
                style={styles.menuAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.menuPostName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {post.userName}
                </Text>
                <Text
                  style={[
                    styles.menuPostTitle,
                    { color: isDark ? "#aaa" : "#666" },
                  ]}
                  numberOfLines={1}
                >
                  {post.title}
                </Text>
              </View>
            </View>
          )}

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: isDark ? "#333" : "#eee" },
            ]}
          />

          {[
            {
              key: "share",
              icon: <Share2 size={20} color={theme.text} />,
              label: "Chia sẻ bài viết",
            },
            {
              key: "copy_link",
              icon: <Link2 size={20} color={theme.text} />,
              label: "Sao chép liên kết",
            },
            {
              key: "hide",
              icon: <EyeOff size={20} color={theme.text} />,
              label: "Ẩn bài viết này",
            },
            {
              key: "report",
              icon: <Flag size={20} color="#e74c3c" />,
              label: "Báo cáo",
              isDestructive: true,
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                index === 3 && { borderBottomWidth: 0 },
                { borderBottomColor: isDark ? "#2C2C2E" : "#f0f0f0" },
              ]}
              onPress={() => onAction(item.key)}
              activeOpacity={0.7}
            >
              {item.icon}
              <Text
                style={[
                  styles.menuItemText,
                  {
                    color: (item as any).isDestructive
                      ? "#e74c3c"
                      : theme.text,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.menuCancelBtn,
              { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.menuCancelText, { color: theme.text }]}>
              Hủy
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    paddingTop: 10,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
    alignSelf: "center",
    marginBottom: 14,
    opacity: 0.4,
  },
  menuPostPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  menuAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eee",
  },
  menuPostName: { fontWeight: "700", fontSize: 14 },
  menuPostTitle: { fontSize: 12, marginTop: 1 },
  menuDivider: { height: 0.5, marginBottom: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  menuItemText: { fontSize: 15, fontWeight: "500" },
  menuCancelBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  menuCancelText: { fontSize: 16, fontWeight: "700" },
});
