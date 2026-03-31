import { router } from "expo-router";
import { BookmarkX, ChevronLeft, FolderOpen } from "lucide-react-native";
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

import PostCard from "@/components/ui/PostCard";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { PostService } from "@/utils/postInteractionService";

const SavedPostsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("saved_posts")
        .select(
          `
          id,
          folder,
          notes,
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

      const formatted = data
        ?.map((item: any) => {
          if (!item.job_posts) return null;
          return {
            ...item.job_posts,
            saved_folder: item.folder,
            likes: item.job_posts.loved_posts?.[0]?.count || 0,
            replies: item.job_posts.comments?.[0]?.count || 0,
            isSaved: true,
          };
        })
        .filter(Boolean);

      setPosts(formatted || []);
    } catch (error) {
      console.error("Fetch saved posts error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleSave = async (postId: string) => {
    const result = await PostService.toggleSave(postId);
    if (result.action === "unsaved") {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconCircle,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <BookmarkX size={48} color={isDark ? "#888" : "#AAA"} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Thư mục rỗng!
      </Text>
      <Text style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
        Bạn hiện chưa lưu bài viết nào để xem lại sau.
      </Text>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.exploreBtnText}>Đi lưu bài viết</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Mục đã lưu
        </Text>

        <TouchableOpacity style={styles.folderBtn}>
          <FolderOpen size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color="#8e44ad" size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              {item.saved_folder && (
                <View
                  style={[
                    styles.folderBadge,
                    { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
                  ]}
                >
                  <Text style={styles.folderBadgeText}>
                    📁 {item.saved_folder}
                  </Text>
                </View>
              )}
              <PostCard
                post={item}
                isSaved={true}
                onToggleSave={() => handleToggleSave(item.id)}
                onPress={(id) => router.push(`/jobs/${id}`)}
              />
            </View>
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listPadding}
          onRefresh={() => {
            setRefreshing(true);
            fetchSavedPosts();
          }}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default SavedPostsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "rgba(150,150,150,0.1)",
  },
  folderBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "rgba(150,150,150,0.1)",
  },
  listPadding: { paddingBottom: 40, paddingTop: 16 },

  folderBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 12,
    borderTopLeftRadius: 12,
    marginLeft: 32,
    marginBottom: -16,
    zIndex: 1,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.2)",
    borderBottomWidth: 0,
  },
  folderBadgeText: {
    fontSize: 13,
    color: "#8e44ad",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 120,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  exploreBtn: {
    backgroundColor: "#8e44ad",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 100,
    shadowColor: "#8e44ad",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
});
