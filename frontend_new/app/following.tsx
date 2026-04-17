import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ChevronLeft, ChevronDown, Users, UserMinus, UserX } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ──────────────────────────────────────────────
interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

type TabKey = "following" | "followers";

// ─── Component ──────────────────────────────────────────
const FollowingScreen = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("following");

  // Popup state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });

  // ─── Fetch "Đang theo dõi" ────────────────────────────
  const {
    data: followingList = [],
    isLoading: loadingFollowing,
    isRefetching: refetchingFollowing,
    refetch: refetchFollowing,
  } = useQuery<UserProfile[]>({
    queryKey: ["following_users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("followers")
        .select(`following_id, user_profiles:following_id ( id, username, full_name, avatar_url )`)
        .eq("follower_id", user.id);
      if (error) throw error;
      return (data as any[]).map((row) => row.user_profiles as UserProfile);
    },
  });

  // ─── Fetch "Người theo dõi" ───────────────────────────
  const {
    data: followersList = [],
    isLoading: loadingFollowers,
    isRefetching: refetchingFollowers,
    refetch: refetchFollowers,
  } = useQuery<UserProfile[]>({
    queryKey: ["follower_users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("followers")
        .select(`follower_id, user_profiles:follower_id ( id, username, full_name, avatar_url )`)
        .eq("following_id", user.id);
      if (error) throw error;
      return (data as any[]).map((row) => row.user_profiles as UserProfile);
    },
  });

  // ─── Derived data based on active tab ─────────────────
  const currentData = activeTab === "following" ? followingList : followersList;
  const isLoading = activeTab === "following" ? loadingFollowing : loadingFollowers;
  const isRefetching = activeTab === "following" ? refetchingFollowing : refetchingFollowers;
  const refetch = activeTab === "following" ? refetchFollowing : refetchFollowers;

  // ─── Popup ────────────────────────────────────────────
  const handleOpenPopup = useCallback((event: any, userItem: UserProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { pageY, pageX } = event.nativeEvent;
    setSelectedUser(userItem);
    setPopoverPos({ top: pageY + 20, right: 16 }); // hiện dưới chổ bấm một xíu
    setModalVisible(true);
  }, []);

  const handleClosePopup = useCallback(() => {
    setModalVisible(false);
    setSelectedUser(null);
  }, []);

  // ─── Unfollow ─────────────────────────────────────────
  const handleUnfollow = async () => {
    if (!selectedUser) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("followers")
        .delete()
        .match({ follower_id: user.id, following_id: selectedUser.id });
      if (error) throw error;
      queryClient.setQueryData<UserProfile[]>(["following_users"], (old) =>
        (old ?? []).filter((u) => u.id !== selectedUser.id)
      );
      handleClosePopup();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Unfollow error:", err);
    }
  };

  // ─── Remove follower ─────────────────────────────────
  const handleRemoveFollower = async () => {
    if (!selectedUser) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("followers")
        .delete()
        .match({ follower_id: selectedUser.id, following_id: user.id });
      if (error) throw error;
      queryClient.setQueryData<UserProfile[]>(["follower_users"], (old) =>
        (old ?? []).filter((u) => u.id !== selectedUser.id)
      );
      handleClosePopup();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Remove follower error:", err);
    }
  };

  // ─── Tab switch ───────────────────────────────────────
  const handleTabPress = (tab: TabKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  // ─── Empty state ──────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
        <Users size={36} color={isDark ? "#666" : "#AAA"} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {activeTab === "following" ? "Bạn chưa theo dõi ai" : "Chưa có ai theo dõi bạn"}
      </Text>
      <Text style={styles.emptySub}>
        {activeTab === "following"
          ? "Hãy khám phá và theo dõi những người bạn quan tâm!"
          : "Hãy chia sẻ nội dung để thu hút mọi người!"}
      </Text>
    </View>
  );

  // ─── Render each user row ─────────────────────────────
  const renderItem = ({ item }: { item: UserProfile }) => (
    <View style={[styles.userRow, { borderBottomColor: isDark ? "#2C2C2E" : "#F0F0F0" }]}>
      {/* Avatar */}
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? "#2C2C2E" : "#EAEAEA" }]}>
          <Text style={{ color: isDark ? "#888" : "#666", fontSize: 17, fontWeight: "700" }}>
            {item.username?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
      )}

      {/* Name + Username */}
      <View style={styles.nameWrap}>
        <Text style={[styles.displayName, { color: theme.text }]} numberOfLines={1}>
          {item.full_name || item.username}
        </Text>
        <Text style={[styles.usernameText, { color: isDark ? "#888" : "#999" }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>

      {/* Action button */}
      {activeTab === "following" ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}
          onPress={(e) => handleOpenPopup(e, item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Đang theo dõi</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}
          onPress={(e) => handleOpenPopup(e, item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Gỡ</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Main render ──────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {activeTab === "following" ? "Đang theo dõi" : "Người theo dõi"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "following" && styles.tabItemActive]}
          onPress={() => handleTabPress("following")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: isDark ? "#888" : "#999" },
              activeTab === "following" && { color: theme.text, fontWeight: "700" },
            ]}
          >
            Đang theo dõi
          </Text>
          {activeTab === "following" && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.text }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "followers" && styles.tabItemActive]}
          onPress={() => handleTabPress("followers")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: isDark ? "#888" : "#999" },
              activeTab === "followers" && { color: theme.text, fontWeight: "700" },
            ]}
          >
            Người theo dõi
          </Text>
          {activeTab === "followers" && (
            <View style={[styles.tabIndicator, { backgroundColor: theme.text }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8e44ad" />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, currentData.length === 0 && { flex: 1 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#8e44ad" />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Popup ── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={handleClosePopup}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.popover,
                  {
                    top: popoverPos.top,
                    right: popoverPos.right,
                    backgroundColor: isDark ? "#2C2C2E" : "#FFF",
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={activeTab === "following" ? handleUnfollow : handleRemoveFollower}
                  style={styles.popoverItem}
                  activeOpacity={0.6}
                >
                  {activeTab === "following" ? (
                    <UserMinus size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                  ) : (
                    <UserX size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.unfollowText}>
                    {activeTab === "following"
                      ? `Ngừng theo dõi @${selectedUser?.username}`
                      : `Gỡ @${selectedUser?.username}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default FollowingScreen;

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 54,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    position: "relative",
  },
  tabItemActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: "500",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "50%",
    borderRadius: 1,
  },

  // List
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingTop: 4,
  },

  // User row
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  nameWrap: {
    flex: 1,
    marginRight: 10,
  },
  displayName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 13,
  },

  // Button
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "#E5E5EA",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
  },

  // Modal / Popup
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  popover: {
    position: "absolute",
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  unfollowText: {
    color: "#FF3B30",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
});