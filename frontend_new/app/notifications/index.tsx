import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 15; // Mỗi lần chỉ tải 15 tin để nhẹ máy

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 1. Hàm Map UI (Tách riêng để tái sử dụng cho Real-time)
  const mapUI = useCallback((item: any) => {
    let icon = 'notifications-outline';
    let iconColor = '#8e44ad';
    let bgColor = isDark ? 'rgba(142, 68, 173, 0.15)' : 'rgba(142, 68, 173, 0.08)';

    const type = item.data?.type;
    if (type === 'match') {
      icon = 'sparkles';
      iconColor = '#8e44ad';
    } else if (type === 'status') {
      icon = 'briefcase-outline';
      iconColor = '#3498db';
      bgColor = isDark ? 'rgba(52, 152, 219, 0.15)' : 'rgba(52, 152, 219, 0.08)';
    } else if (type === 'system') {
      icon = 'shield-checkmark-outline';
      iconColor = '#27ae60';
      bgColor = isDark ? 'rgba(39, 174, 96, 0.15)' : 'rgba(39, 174, 96, 0.08)';
    }
    return { ...item, icon, iconColor, bgColor };
  }, [isDark]);

  // 2. Hàm Fetch chính có Phân trang
  const fetchNotifications = async (pageNum: number, isRefresh = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to); // Chỉ lấy trong khoảng quy định

      if (error) throw error;

      const mapped = (data || []).map(mapUI);

      if (isRefresh) {
        setNotifications(mapped);
        setHasMore(mapped.length === PAGE_SIZE);
      } else {
        setNotifications(prev => [...prev, ...mapped]);
        setHasMore(mapped.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Lỗi tải thông báo:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Khởi tạo và Real-time
  useEffect(() => {
    fetchNotifications(0, true);

    const channel = supabase
      .channel('notif-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          // TỐI ƯU: Chỉ chèn tin mới vào đầu, không fetch lại cả list
          const newNotif = mapUI(payload.new);
          setNotifications(prev => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mapUI]);

  // 3. Xử lý Tải thêm (Load More)
  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchNotifications(0, true);
  };

  const handlePress = async (item: any) => {
    if (!item.is_read) {
      setNotifications(prev => 
        prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
      );
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
    }
    if (item.data?.job_id) router.push(`/jobs/${item.data.job_id}`);
    else if (item.data?.screen) router.push(item.data.screen as any);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={() => handlePress(item)}
      style={[
        styles.notificationItem, 
        { backgroundColor: isDark ? (item.is_read ? theme.background : '#1C1C1E') : (item.is_read ? theme.background : '#F0F5FF') }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
        <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text, fontWeight: item.is_read ? '500' : '800' }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.body, { color: isDark ? '#A0A0A5' : '#6C6C70' }]} numberOfLines={2}>{item.content}</Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Thông báo</Text>
        <View style={{ width: 40 }} /> 
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#8e44ad" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8e44ad" />}
          ListFooterComponent={() => (
            loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color="#8e44ad" /> : <View style={{ height: 40 }} />
          )}
          // Cài đặt FlatList để cuộn mượt hơn
          removeClippedSubviews={true} 
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 56, borderBottomWidth: 0.5 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  notificationItem: { flexDirection: 'row', padding: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(150,150,150,0.1)' },
  iconContainer: { width: 40, height: 40, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  textContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 15, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' },
  body: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  time: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});