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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
      <HeartOff size={64} color={isDark ? "#333" : "#CCC"} />
      <Text style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
        Bạn chưa thích bài viết nào.
      </Text>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.exploreBtnText}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? "#222" : "#F0F0F0" },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Bài viết đã thích
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
    </SafeAreaView>
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
    height: 56,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { padding: 4 },
  listPadding: { paddingBottom: 40, paddingTop: 10 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: "#8e44ad",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreBtnText: { color: "#FFF", fontWeight: "700" },
});
