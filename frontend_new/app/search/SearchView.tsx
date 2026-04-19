import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, 
  FlatList, Image, TouchableOpacity, ActivityIndicator, Platform 
} from 'react-native';
import { Search, ChevronLeft, X, Briefcase, MapPin } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Kết nối tài nguyên của Louis
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/themes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// --- Sub-Component: Item kết quả (Dùng memo để tối ưu cuộn danh sách) ---
const ProfileItem = memo(({ profile, theme, isDark }: any) => {
  const accentColor = '#8e44ad';
  
  return (
    <TouchableOpacity 
      style={styles.profileItem} 
    //   onPress={() => router.push(`/profile/${profile.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <Image 
        source={{ uri: profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=8e44ad&color=fff` }} 
        style={styles.avatar} 
      />
      
      {/* Thông tin chính */}
      <View style={[styles.infoContainer, { borderBottomColor: isDark ? '#222' : '#F0F0F0' }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.fullName, { color: theme.text }]} numberOfLines={1}>
              {profile.full_name || 'Người dùng mới'}
            </Text>
            {profile.is_open_to_work && (
              <View style={styles.openBadge}>
                <Text style={styles.openText}>Sẵn sàng</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.headline} numberOfLines={1}>
            {profile.headline || 'Chưa cập nhật tiêu đề'}
          </Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Briefcase size={12} color="#8E8E93" />
              <Text style={styles.metaText}>{profile.years_of_experience} năm kinh nghiệm</Text>
            </View>
            {profile.preferred_locations?.[0] && (
              <View style={styles.metaItem}>
                <MapPin size={12} color="#8E8E93" />
                <Text style={styles.metaText}>{profile.preferred_locations[0]}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Nút xem chi tiết nhỏ gọn */}
        <TouchableOpacity style={[styles.detailBtn, { borderColor: accentColor }]}>
          <Text style={{ color: accentColor, fontWeight: '700', fontSize: 12 }}>Hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const SearchView = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Logic: Truy vấn Supabase ---
  const fetchProfiles = async (query: string) => {
  setLoading(true);
  try {
    // 1. Lấy ID của Louis (người đang dùng app)
    let supabaseQuery = supabase
      .from('user_profiles')
      .select('id, full_name, headline, avatar_url, is_open_to_work, years_of_experience, preferred_locations')
      // 2. 🎯 LOẠI BỎ CHÍNH MÌNH: id KHÔNG ĐƯỢC BẰNG user.id
      .neq('id', user?.id) 
      .order('created_at', { ascending: false })
      .limit(20);

    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(`full_name.ilike.%${query}%,headline.ilike.%${query}%`);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    setProfiles(data || []);
  } catch (error) {
    console.error('Search query error:', error);
  } finally {
    setLoading(false);
  }
};

  // --- Tối ưu Performance: Debounce 400ms ---
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfiles(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} />
        </TouchableOpacity>
        
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
          <Search size={18} color="#8E8E93" />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Tìm ứng viên, vị trí công việc..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Danh sách kết quả */}
      {loading && !profiles.length ? (
        <View style={styles.center}>
          <ActivityIndicator color="#8e44ad" size="large" />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProfileItem profile={item} theme={theme} isDark={isDark} />}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Kết quả cho "${searchQuery}"` : 'Ứng viên tiềm năng'}
            </Text>
          }
          ListEmptyComponent={
            !loading ? <Text style={styles.emptyText}>Không tìm thấy hồ sơ nào phù hợp</Text> : null
          }
          // Tối ưu hóa FlatList
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
};

export default SearchView;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { marginRight: 8, marginLeft: -8, padding: 4 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  input: { flex: 1, fontSize: 16, marginLeft: 10, paddingVertical: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPadding: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8E8E93',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  profileItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  avatar: { width: 56, height: 56, borderRadius: 36, backgroundColor: '#eee' },
  infoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
    borderBottomWidth: 0.5,
    paddingBottom: 15,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullName: { fontSize: 16, fontWeight: '700' },
  openBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  headline: { fontSize: 14, color: '#8E8E93', marginTop: 2, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#8E8E93' },
  detailBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8E8E93' },
});