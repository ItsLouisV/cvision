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
import { UserPlus, UserMinus, UserCircle } from "lucide-react-native";

interface AvatarMenuProps {
  visible: boolean;
  onClose: () => void;
  post: any;
  theme: any;
  isDark: boolean;
  isFollowing: boolean;
  onAction: (action: string) => void;
  position?: { x: number; y: number } | null;
}

export const AvatarMenu = ({
  visible,
  onClose,
  post,
  theme,
  isDark,
  isFollowing,
  onAction,
  position,
}: AvatarMenuProps) => {
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
            styles.menuPopup,
            { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
            position ? {
              top: position.y + 4,
              left: Math.max(16, position.x),
            } : {},
          ]}
          onPress={() => {}}
        >

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
                {post.companyName && (
                  <Text
                    style={[
                      styles.menuPostTitle,
                      { color: isDark ? "#aaa" : "#666" },
                    ]}
                    numberOfLines={1}
                  >
                    {post.companyName}
                  </Text>
                )}
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
              key: "toggle_follow",
              icon: isFollowing ? (
                <UserMinus size={20} color={theme.text} />
              ) : (
                <UserPlus size={20} color={theme.text} />
              ),
              label: isFollowing ? "Bỏ theo dõi" : "Theo dõi",
            },
            {
              key: "visit_profile",
              icon: <UserCircle size={20} color={theme.text} />,
              label: "Truy cập vào trang cá nhân",
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                index === 1 && { borderBottomWidth: 0 },
                { borderBottomColor: isDark ? "#2C2C2E" : "#f0f0f0" },
              ]}
              onPress={() => onAction(item.key)}
              activeOpacity={0.7}
            >
              {item.icon}
              <Text
                style={[
                  styles.menuItemText,
                  { color: theme.text },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)", // lighter overlay for popup
  },
  menuPopup: {
    position: "absolute",
    width: 260,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
});
