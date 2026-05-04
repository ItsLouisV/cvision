import { router } from "expo-router";
import { ChevronLeft, HeartOff } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { PostService } from "@/utils/postInteractionService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
// Giả sử Louis đã tách PostCard ra một file riêng để dùng chung
import PostCard from "@/components/ui/PostCard";

const LovedPostsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { user } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchLovedPosts();
  }, [user]);

  const fetchLovedPosts = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // 🎯 TRUY VẤN LỒNG: Lấy từ bảng loved_posts và join sang job_posts
      const { data, error } = await supabase
        .from("loved_posts")
        .select(
          `
          created_at,
          job_posts (
            *,
            employers (company_name, company_logo, is_verified),
            user_profiles (full_name, avatar_url),
            loved_posts(count),
            comments(count)
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 🎯 LÀM PHẲNG DỮ LIỆU (Flatten): Đưa dữ liệu job_posts ra ngoài cho dễ dùng
      const formatted = data
        ?.map((item: any) => {
          const job = item.job_posts;
          if (!job) return null;
          return {
            ...job,
            likes: job.loved_posts?.[0]?.count || 0,
            replies: job.comments?.[0]?.count || 0,
            isLiked: true, // Chắc chắn là true vì đang ở màn hình Loved
          };
        })
        .filter(Boolean);

      setPosts(formatted || []);
    } catch (error) {
      console.error("Fetch loved posts error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const result = await PostService.toggleLike(postId);
    if (result.action === "unloved") {
      // Nếu người dùng bỏ tim, xóa ngay khỏi danh sách hiển thị
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
        <HeartOff size={48} color={isDark ? "#444" : "#AAA"} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Chưa có bài viết yêu thích
      </Text>
      <Text style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
        Những bài viết bạn thả tim sẽ xuất hiện tại đây để bạn dễ dàng tìm lại.
      </Text>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.exploreBtnText}>Khám phá ngay</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { 
            paddingTop: insets.top,
            backgroundColor: theme.background,
            borderBottomColor: isDark ? "#1C1C1E" : "#F2F2F7" 
          },
        ]}
      >
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}
        >
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Yêu thích
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color="#8e44ad"
          size="large"
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              isLiked={true}
              onToggleLike={() => handleToggleLike(item.id)}
              // Truyền thêm các props cần thiết cho PostCard của Louis
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listPadding}
          onRefresh={() => {
            setRefreshing(true);
            fetchLovedPosts();
          }}
          refreshing={refreshing}
        />
      )}
    </View>
  );
};

export default LovedPostsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  backBtn: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  listPadding: { 
    paddingBottom: 40, 
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreBtn: {
    backgroundColor: "#8e44ad",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: "#8e44ad",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: { 
    color: "#FFF", 
    fontWeight: "800",
    fontSize: 16,
  },
});
