import React, { useState, useCallback, useRef } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  NativeSyntheticEvent,
  TextLayoutEventData
} from "react-native";
import {
  Bookmark,
  CircleDollarSign,
  Ellipsis,
  Heart,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  Verified
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Pressable as RNGHPressable } from "react-native-gesture-handler";

const JOB_TYPE_MAP: Record<string, string> = {
  "full-time": "Toàn thời gian",
  "part-time": "Bán thời gian",
  contract: "Hợp đồng",
  internship: "Thực tập",
  freelance: "Freelance",
  remote: "Remote",
};

const MAX_CONTENT_LINES = 5;

// Reusable pressable component with opacity
export const PressableOpacity = ({
  children,
  style,
  activeOpacity = 0.7,
  ...props
}: any) => {
  return (
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
};

export interface AvatarPosition {
  x: number;
  y: number;
}

export interface PostCardProps {
  post: any;
  isDark: boolean;
  theme: any;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onToggleLike?: () => void;
  onToggleBookmark?: () => void;
  onShare?: () => void;
  onPressPost?: () => void;
  onPressMenu?: () => void;
  onPressAvatar?: (pos: AvatarPosition) => void;
}

export const PostCard = React.memo(
  ({
    post,
    isDark,
    theme,
    isLiked = false,
    isBookmarked = false,
    onToggleLike,
    onToggleBookmark,
    onShare,
    onPressPost,
    onPressMenu,
    onPressAvatar,
  }: PostCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const avatarRef = useRef<View>(null);

    const handlePressAvatar = () => {
      avatarRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
        onPressAvatar?.({ x: pageX, y: pageY + height });
      });
    };

    const handleTextLayout = useCallback(
      (e: NativeSyntheticEvent<TextLayoutEventData>) => {
        if (e.nativeEvent.lines.length > MAX_CONTENT_LINES) {
          setIsClamped(true);
        }
      },
      [],
    );

    const toggleExpand = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsExpanded((prev) => !prev);
    };

    return (
      <RNGHPressable
        style={({ pressed }) => [
          styles.postWrapper,
          pressed && { opacity: 0.92 },
        ]}
        onPress={onPressPost}
      >
        {/* LEFT COLUMN – AVATAR */}
        <View style={styles.leftColumn}>
          <PressableOpacity style={styles.avatarContainer} onPress={handlePressAvatar}>
            <View ref={avatarRef} collapsable={false}>
              <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
              {post.is_verified && (
                <View
                  style={[
                    styles.verifiedIcon,
                    { backgroundColor: isDark ? "#1C1C1E" : "#FFF" },
                  ]}
                >
                  <Verified
                    size={14}
                    color="#8e44ad"
                    fill={isDark ? "#1C1C1E" : "#FFF"}
                  />
                </View>
              )}
            </View>
          </PressableOpacity>
        </View>

        {/* RIGHT COLUMN – CONTENT */}
        <View
          style={[
            styles.rightColumn,
            { borderBottomColor: isDark ? "#2C2C2E" : "#ebedf0" },
          ]}
        >
          {/* USER ROW: name · company badge · time · ellipsis */}
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <Text
                style={[styles.userName, { color: theme.text }]}
                numberOfLines={1}
              >
                {post.userName}
              </Text>
              {post.companyName ? (
                <View
                  style={[
                    styles.companyBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(142,68,173,0.15)"
                        : "rgba(142,68,173,0.08)",
                    },
                  ]}
                >
                  <Text style={styles.companyBadgeText} numberOfLines={1}>
                    {post.companyName}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.userRowRight}>
              <Text
                style={[styles.timeText, { color: isDark ? "#666" : "#999" }]}
              >
                {post.time}
              </Text>
              <PressableOpacity
                onPress={onPressMenu}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4, marginLeft: 4 }}
              >
                <Ellipsis size={18} color={isDark ? "#666" : "#999"} />
              </PressableOpacity>
            </View>
          </View>

          {/* JOB TITLE */}
          <Text style={[styles.jobTitle, { color: theme.text }]}>
            {post.title}
          </Text>

          {/* CONTENT – clamped text */}
          <Text
            style={[styles.postContent, { color: theme.text }]}
            numberOfLines={isExpanded ? undefined : MAX_CONTENT_LINES}
            onTextLayout={handleTextLayout}
          >
            {post.content}
          </Text>
          {isClamped && (
            <PressableOpacity onPress={toggleExpand} activeOpacity={0.7}>
              <Text style={styles.seeMoreText}>
                {isExpanded ? "Thu gọn" : "Xem thêm"}
              </Text>
            </PressableOpacity>
          )}

          {/* JOB META */}
          <View style={styles.jobMetaRow}>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark
                    ? "rgba(142,68,173,0.12)"
                    : "rgba(142,68,173,0.06)",
                },
              ]}
            >
              <Text style={styles.metaChipText}>
                {JOB_TYPE_MAP[post.type] || post.type}
              </Text>
            </View>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark
                    ? "rgba(142,68,173,0.12)"
                    : "rgba(142,68,173,0.06)",
                },
              ]}
            >
              <CircleDollarSign size={13} color="#8e44ad" />
              <Text style={styles.metaChipText}>{post.salary}</Text>
            </View>
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark
                    ? "rgba(142,68,173,0.12)"
                    : "rgba(142,68,173,0.06)",
                },
              ]}
            >
              <MapPin size={13} color="#8e44ad" />
              <Text style={styles.metaChipText}>{post.location}</Text>
            </View>
          </View>

          {/* ACTIONS */}
          <View style={styles.actionContainer}>
            <View style={styles.actionRow}>
              <PressableOpacity style={styles.actionBtn} onPress={onToggleLike}>
                <Heart
                  size={20}
                  color={isLiked ? "#e74c3c" : isDark ? "#888" : "#666"}
                  fill={isLiked ? "#e74c3c" : "transparent"}
                />
                {post.likes > 0 && (
                  <Text
                    style={[
                      styles.actionCount,
                      { color: isLiked ? "#e74c3c" : isDark ? "#888" : "#666" },
                    ]}
                  >
                    {post.likes}
                  </Text>
                )}
              </PressableOpacity>

              <PressableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
              >
                <MessageCircle size={19} color={isDark ? "#888" : "#666"} />
                {post.replies > 0 && (
                  <Text
                    style={[
                      styles.actionCount,
                      { color: isDark ? "#888" : "#666" },
                    ]}
                  >
                    {post.replies}
                  </Text>
                )}
              </PressableOpacity>

              <PressableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
              >
                <RefreshCw size={19} color={isDark ? "#888" : "#666"} />
              </PressableOpacity>

              <PressableOpacity style={styles.actionBtn} onPress={onShare}>
                <Send size={19} color={isDark ? "#888" : "#666"} />
              </PressableOpacity>
            </View>

            <PressableOpacity
              style={styles.actionBtnRight}
              onPress={onToggleBookmark}
            >
              <Bookmark
                size={20}
                color={isBookmarked ? "#FFD700" : isDark ? "#888" : "#666"}
                fill={isBookmarked ? "#FFD700" : "transparent"}
              />
            </PressableOpacity>
          </View>
        </View>
      </RNGHPressable>
    );
  },
);

const styles = StyleSheet.create({
  postWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 14,
  },
  leftColumn: { alignItems: "center", width: 45 },
  avatarContainer: { width: 42, height: 42, position: "relative" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eee",
  },
  verifiedIcon: {
    position: "absolute",
    bottom: -3,
    right: -3,
    borderRadius: 10,
    padding: 1,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },

  // ── User row ──
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: { fontWeight: "800", fontSize: 15 },
  companyBadge: {
    alignSelf: "flex-start",
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8e44ad",
  },
  userRowRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  timeText: { fontSize: 13, fontWeight: "400" },

  // ── Job content ──
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  postContent: {
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
    opacity: 0.8,
  },
  seeMoreText: {
    color: "#8e44ad",
    fontWeight: "600",
    fontSize: 13.5,
    marginTop: 3,
  },

  // ── Meta chips ──
  jobMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8e44ad",
  },

  // ── Actions ──
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginLeft: -4,
  },
  actionRow: { flexDirection: "row", alignItems: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    padding: 4,
  },
  actionBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  actionCount: { fontSize: 13, marginLeft: 5, fontWeight: "500" },
});
