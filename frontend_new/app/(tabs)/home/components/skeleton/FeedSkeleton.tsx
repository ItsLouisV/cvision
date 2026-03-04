import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, Dimensions } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

const FeedSkeleton = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation điều khiển luồng sáng
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 1800,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Màu nền dựa trên theme
  const bgColor = isDark ? '#222' : '#E1E9EE';
  const shimmerColor = isDark ? '#333' : '#F2F8FC';

  const ShimmerOverlay = () => (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [{ translateX }],
          backgroundColor: shimmerColor,
          opacity: isDark ? 0.3 : 0.6,
          width: width * 0.6,
        },
      ]}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={[styles.postWrapper, { borderBottomColor: isDark ? '#111' : '#f0f0f0' }]}>
          
          {/* Header Post: Avatar + Name */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: bgColor }]}>
              <ShimmerOverlay />
            </View>
            <View style={styles.headerText}>
              <View style={[styles.nameBar, { backgroundColor: bgColor }]}>
                <ShimmerOverlay />
              </View>
              <View style={[styles.timeBar, { backgroundColor: bgColor }]}>
                <ShimmerOverlay />
              </View>
            </View>
          </View>

          {/* Nội dung text bài viết */}
          <View style={styles.contentSection}>
            <View style={[styles.contentBar, { backgroundColor: bgColor, width: '95%' }]}>
              <ShimmerOverlay />
            </View>
            <View style={[styles.contentBar, { backgroundColor: bgColor, width: '70%' }]}>
              <ShimmerOverlay />
            </View>
          </View>

          {/* Phần hình ảnh/video bài viết */}
          <View style={[styles.imageBox, { backgroundColor: bgColor }]}>
            <ShimmerOverlay />
          </View>

          {/* Thanh tương tác giả lập (Like, Comment, Share) */}
          <View style={styles.footer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.footerBtn, { backgroundColor: bgColor }]}>
                <ShimmerOverlay />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  postWrapper: { 
    padding: 16, 
    borderBottomWidth: 8, // Tạo khoảng cách giữa các post như Facebook
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    overflow: 'hidden',
    position: 'relative' 
  },
  headerText: { 
    marginLeft: 12, 
    gap: 6 
  },
  nameBar: { 
    height: 14, 
    width: 120, 
    borderRadius: 7, 
    overflow: 'hidden' 
  },
  timeBar: { 
    height: 10, 
    width: 60, 
    borderRadius: 5, 
    overflow: 'hidden' 
  },
  contentSection: { 
    marginBottom: 16, 
    gap: 8 
  },
  contentBar: { 
    height: 12, 
    borderRadius: 6, 
    overflow: 'hidden' 
  },
  imageBox: { 
    height: 250, 
    width: '100%', 
    borderRadius: 16, 
    overflow: 'hidden' 
  },
  footer: { 
    flexDirection: 'row', 
    marginTop: 16, 
    gap: 20 
  },
  footerBtn: { 
    height: 24, 
    width: 60, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
});

export default FeedSkeleton;