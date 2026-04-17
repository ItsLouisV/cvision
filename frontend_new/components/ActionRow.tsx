import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import {
  Bookmark,
  Heart,
  MessageCircle,
  RefreshCw,
  Send,
  Share2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Pressable as RNGHPressable } from "react-native-gesture-handler";

/**
 * Shared action row used in PostCard (feed) and JobDetail.
 *
 * Supports: Like, Comment, Repost, Share, Bookmark
 * Each action is optional — pass the handler to show it.
 */

// ── Pressable with opacity ──
const PressableOpacity = ({ children, style, activeOpacity = 0.7, ...props }: any) => (
  <RNGHPressable
    {...props}
    style={(state: any) => [
      typeof style === "function" ? style(state) : style,
      state.pressed && { opacity: activeOpacity },
    ]}
  >
    {children}
  </RNGHPressable>
);

export interface ActionRowProps {
  isDark: boolean;

  // Like / Heart
  isLiked?: boolean;
  likeCount?: number;
  onLike?: () => void;

  // Comment
  commentCount?: number;
  onComment?: () => void;

  // Repost
  onRepost?: () => void;

  // Share
  onShare?: () => void;
  /** Use Share2 icon instead of Send (default: Send) */
  shareIcon?: "send" | "share2";

  // Bookmark
  isBookmarked?: boolean;
  onBookmark?: () => void;

  /** Container style override */
  style?: StyleProp<ViewStyle>;
}

export const ActionRow = React.memo(
  ({
    isDark,
    isLiked = false,
    likeCount,
    onLike,
    commentCount,
    onComment,
    onRepost,
    onShare,
    shareIcon = "send",
    isBookmarked = false,
    onBookmark,
    style,
  }: ActionRowProps) => {
    const muted = isDark ? "#888" : "#666";

    return (
      <View style={[styles.container, style]}>
        {/* Left group */}
        <View style={styles.leftGroup}>
          {/* Like */}
          {onLike && (
            <PressableOpacity style={styles.btn} onPress={onLike}>
              <Heart
                size={20}
                color={isLiked ? "#e74c3c" : muted}
                fill={isLiked ? "#e74c3c" : "transparent"}
              />
              {(likeCount ?? 0) > 0 && (
                <Text
                  style={[
                    styles.count,
                    { color: isLiked ? "#e74c3c" : muted },
                  ]}
                >
                  {likeCount}
                </Text>
              )}
            </PressableOpacity>
          )}

          {/* Comment */}
          {onComment && (
            <PressableOpacity style={styles.btn} onPress={onComment}>
              <MessageCircle size={19} color={muted} />
              {(commentCount ?? 0) > 0 && (
                <Text style={[styles.count, { color: muted }]}>
                  {commentCount}
                </Text>
              )}
            </PressableOpacity>
          )}

          {/* Repost */}
          {onRepost && (
            <PressableOpacity
              style={styles.btn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRepost();
              }}
            >
              <RefreshCw size={19} color={muted} />
            </PressableOpacity>
          )}

          {/* Share */}
          {onShare && (
            <PressableOpacity
              style={styles.btn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onShare();
              }}
            >
              {shareIcon === "share2" ? (
                <Share2 size={19} color={muted} />
              ) : (
                <Send size={19} color={muted} />
              )}
            </PressableOpacity>
          )}
        </View>

        {/* Bookmark (pushed to the right) */}
        {onBookmark && (
          <PressableOpacity style={styles.btn} onPress={onBookmark}>
            <Bookmark
              size={20}
              color={isBookmarked ? "#007AFF" : muted}
              fill={isBookmarked ? "#007AFF" : "transparent"}
            />
          </PressableOpacity>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    padding: 4,
  },
  count: {
    fontSize: 13,
    marginLeft: 5,
    fontWeight: "500",
  },
});
