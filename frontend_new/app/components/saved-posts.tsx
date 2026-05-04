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
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import PostCard from "@/components/ui/PostCard";
import { Colors } from "@/constants/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { PostService } from "@/utils/postInteractionService";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const SavedPostsScreen = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { user } = useCurrentUser();
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchSavedPosts();
  }, [user]);

  const fetchSavedPosts = async () => {
    try {
      setLoading(true);
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
            backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
          },
        ]}
      >
        <BookmarkX size={48} color={isDark ? "#444" : "#AAA"} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        Thư mục trống
      </Text>
      <Text style={[styles.emptyText, { color: isDark ? "#888" : "#666" }]}>
        Lưu lại những công việc thú vị để xem kỹ hơn khi bạn có thời gian nhé.
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
          Đã lưu
        </Text>

        <TouchableOpacity 
          style={[styles.folderBtn, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}
        >
          <FolderOpen size={22} color={theme.text} />
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
    </View>
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
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  folderBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  listPadding: { 
    paddingBottom: 40, 
    paddingTop: 12,
  },

  folderBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 12,
    borderTopLeftRadius: 12,
    marginLeft: 16,
    marginBottom: -8,
    zIndex: 1,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.1)",
    borderBottomWidth: 0,
  },
  folderBadgeText: {
    fontSize: 12,
    color: "#8e44ad",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyIconCircle: {
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
    marginBottom: 32,
    lineHeight: 22,
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
    fontSize: 16 
  },
});
