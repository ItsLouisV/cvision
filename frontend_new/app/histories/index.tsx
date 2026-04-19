// app/histories/index.tsx

import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft, Trash2 } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface UserCV {
  id: string;
  file_name: string;
  created_at: string;
}

export default function HistoryListScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const accentColor = "#8e44ad";
  const router = useRouter();
  const { user } = useCurrentUser();

  const [cvs, setCvs] = useState<UserCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, Swipeable>());

  const fetchCVs = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from("user_cvs")
        .select("id, file_name, created_at")
        .eq("user_id", user.id)
        .or("is_default.eq.false,is_default.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCvs(data || []);
    } catch (err) {
      console.error("Fetch CV Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) fetchCVs();
    }, [user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCVs();
  };

  const handleDelete = (id: string, fileName: string) => {
    Alert.alert(
      "Xóa lịch sử",
      `Tạm biệt bản ghi "${fileName || "không tên"}"?`,
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Xóa vĩnh viễn",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("user_cvs")
                .delete()
                .eq("id", id);
              if (error) throw error;
              setCvs((prev) => prev.filter((item) => item.id !== id));
            } catch (err) {
              Alert.alert("Lỗi", "Không thể xóa mục này.");
            }
          },
        },
      ],
    );
  };

  // --- HIỆU ỨNG SWIPE LẠ MẮT ---
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    id: string,
    fileName: string,
  ) => {
    // Nút tròn phóng to khi kéo
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    // Độ mờ của nút tròn
    const opacity = dragX.interpolate({
      inputRange: [-50, -20],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.swipeActionContainer}>
        <Animated.View
          style={[
            styles.deleteCircleWrapper,
            { transform: [{ scale }], opacity },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.6}
            style={styles.deleteCircle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleDelete(id, fileName);
            }}
          >
            <Trash2 size={24} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: UserCV }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          rowRefs.current.set(item.id, ref);
        } else {
          rowRefs.current.delete(item.id);
        }
      }}
      renderRightActions={(p, d) =>
        renderRightActions(p, d, item.id, item.file_name)
      }
      friction={1.5}
      rightThreshold={30}
      onSwipeableWillOpen={() => {
        if (openRowId && openRowId !== item.id) {
          rowRefs.current.get(openRowId)?.close();
        }
        setOpenRowId(item.id);
      }}
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
        ]}
        onPress={() =>
          router.push({
            pathname: "/analysis_history",
            params: { id: item.id },
          })
        }
      >
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: isDark ? "#2C2C2E" : "#F8F0FC" },
            ]}
          >
            <Ionicons name="sparkles-outline" size={20} color={accentColor} />
          </View>

          <View style={styles.textGroup}>
            <Text
              style={[styles.fileName, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.file_name || "Bản phân tích cũ"}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={12} color="#8E8E93" />
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString("vi-VN")}
              </Text>
              <View style={styles.dot} />
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.arrowIcon}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isDark ? "#8e8e93" : "#8e8e93"}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? "#000" : "#fff" },
        ]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* CUSTOM HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerAction}
          >
            <ChevronLeft size={30} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Lịch sử
          </Text>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Đang lấy dữ liệu...
            </Text>
          </View>
        ) : (
          <FlatList
            data={cvs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listPadding}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyView}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="leaf-outline" size={40} color="#8E8E93" />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Trống trơn
                </Text>
                <Text style={styles.emptySub}>
                  Hãy bắt đầu phân tích CV đầu tiên của bạn.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  listPadding: {
    padding: 20,
    paddingBottom: 100,
  },
  swipeableContainer: {
    marginBottom: 10,
    overflow: "visible",
  },
  card: {
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    padding: 18,
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  textGroup: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#8E8E93",
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D1D6",
    marginHorizontal: 8,
  },
  arrowIcon: {
    marginLeft: 10,
  },
  // Swipe Actions
  swipeActionContainer: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteCircleWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  deleteCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Empty State
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(142, 68, 173, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
});
