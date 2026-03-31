import React, { useState, useCallback, memo } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  Dimensions, NativeSyntheticEvent, TextLayoutEventData,
  Platform
} from 'react-native';
import { 
  Heart, MessageCircle, Share2, Bookmark, 
  MapPin, CircleDollarSign, Verified, MoreHorizontal
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');
const MAX_LINES = 3;

interface PostCardProps {
  post: any;
  isLiked?: boolean;
  isSaved?: boolean;
  onToggleLike?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  onShare?: (post: any) => void;
  onPress?: (id: string) => void;
}

const PostCard = ({ 
  post, 
  isLiked, 
  isSaved, 
  onToggleLike, 
  onToggleSave, 
  onShare, 
  onPress 
}: PostCardProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);

  const onTextLayout = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (e.nativeEvent.lines.length > MAX_LINES && !isExpanded) {
      setShowSeeMore(true);
    }
  }, [isExpanded]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress(post.id);
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onToggleLike) onToggleLike(post.id);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onToggleSave) onToggleSave(post.id);
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.95} 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.background,
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        }
      ]}
      onPress={handlePress}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
          {post.is_verified && (
            <View style={[styles.verifiedBadge, { borderColor: theme.background }]}>
              <Verified size={14} color="#FFF" fill="#8e44ad" />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {post.userName}
          </Text>
          <Text style={styles.timeText}>{post.time}</Text>
        </View>
        <TouchableOpacity style={styles.moreBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
           <MoreHorizontal size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <View style={styles.contentBody}>
        <Text style={[styles.jobTitle, { color: theme.text }]}>{post.title}</Text>
        
        <Text 
          style={[styles.description, { color: isDark ? '#CCC' : '#444' }]}
          numberOfLines={isExpanded ? undefined : MAX_LINES}
          onTextLayout={onTextLayout}
        >
          {post.content}
        </Text>
        
        {showSeeMore && (
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
            <Text style={styles.seeMoreBtn}>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* META CHIPS */}
      <View style={styles.metaRow}>
        <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(142,68,173,0.15)' : 'rgba(142,68,173,0.08)' }]}>
          <CircleDollarSign size={14} color="#8e44ad" />
          <Text style={styles.chipText}>{post.salary}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(142,68,173,0.15)' : 'rgba(142,68,173,0.08)' }]}>
          <MapPin size={14} color="#8e44ad" />
          <Text style={styles.chipText}>{post.location}</Text>
        </View>
      </View>

      {/* FOOTER ACTIONS */}
      <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={styles.footerLeft}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Heart size={22} color={isLiked ? '#e74c3c' : '#8E8E93'} fill={isLiked ? '#e74c3c' : 'transparent'} />
            <Text style={[styles.actionCount, isLiked && { color: '#e74c3c' }]}>{post.likes > 0 ? post.likes : ''}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handlePress} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <MessageCircle size={22} color="#8E8E93" />
            <Text style={styles.actionCount}>{post.replies > 0 ? post.replies : ''}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onShare?.(post)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Share2 size={22} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSave} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Bookmark size={22} color={isSaved ? '#f1c40f' : '#8E8E93'} fill={isSaved ? '#f1c40f' : 'transparent'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default memo(PostCard);

const styles = StyleSheet.create({
  container: { 
    marginBottom: 16, 
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEE' },
  verifiedBadge: { position: 'absolute', bottom: -4, right: -4, borderRadius: 12, borderWidth: 2 },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  timeText: { fontSize: 12, color: '#8E8E93', marginTop: 3 },
  moreBtn: { padding: 4 },
  contentBody: { paddingHorizontal: 16, marginBottom: 14 },
  jobTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, lineHeight: 24 },
  description: { fontSize: 15, lineHeight: 22 },
  seeMoreBtn: { color: '#8e44ad', fontWeight: '700', fontSize: 14, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  chipText: { fontSize: 13, fontWeight: '700', color: '#8e44ad' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 14, color: '#8E8E93', fontWeight: '600' }
});