import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageView from "react-native-image-viewing"; 
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function AccountIndexScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useCurrentUser();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  // 1. Tự động load lại dữ liệu mỗi khi màn hình được Focus (quay về từ Edit)
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      if (!user) return;
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
      // Thêm timestamp vào URL để buộc Image tải lại ảnh mới nếu vừa đổi
      const avatarWithCacheBuster = data?.avatar_url 
        ? `${data.avatar_url}?t=${new Date().getTime()}` 
        : null;
      setProfile({ ...data, avatar_url: avatarWithCacheBuster, email: user.email });
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  const currentAvatar = profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile?.full_name || 'Louis') + '&background=8e44ad&color=fff';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F2F2F7' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* HEADER */}
      <SafeAreaView edges={['top']} style={[styles.headerContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Tài khoản</Text>
          <TouchableOpacity 
            onPress={() => router.push('/settings/account/edit' as any)} 
            style={styles.iconBtn}
          >
            <Text style={styles.editLabel}>Sửa</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color="#8e44ad" />
          <Text style={{ marginTop: 12, color: '#8E8E93' }}>Loading...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          
          {/* PROFILE CARD */}
          <View style={[styles.profileCard, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
            {/* Chạm vào Wrapper để mở Zoom ảnh */}
            <TouchableOpacity 
              onPress={() => setIsImageViewVisible(true)} 
              style={styles.avatarWrapper}
            >
              <Image 
                source={{ uri: currentAvatar }} 
                style={styles.avatarImage} 
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color="#8e44ad" />
              </View>
            </TouchableOpacity>
            
            <Text style={[styles.userName, { color: theme.text }]}>{profile?.full_name || 'Chưa cập nhật'}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
          </View>

          {/* TRÌNH ZOOM ẢNH PHÓNG TO */}
          <ImageView
            images={[{ uri: currentAvatar }]}
            imageIndex={0}
            visible={isImageViewVisible}
            onRequestClose={() => setIsImageViewVisible(false)}
            swipeToCloseEnabled={true}
            doubleTapToZoomEnabled={true}
          />

          {/* CHI TIẾT TÀI KHOẢN */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>THÔNG TIN CHI TIẾT</Text>
            <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>SỐ ĐIỆN THOẠI</Text>
                <Text style={[styles.value, { color: theme.text }]}>{profile?.phone || 'Chưa thiết lập'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>VAI TRÒ</Text>
                <Text style={[styles.value, { color: '#8e44ad', fontWeight: '700' }]}>
                    {profile?.role === 'employer' ? 'Nhà tuyển dụng' : 'Ứng viên / Tài khoản thường'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>NGÀY GIA NHẬP</Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '---'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footerContainer}>
             <MaterialCommunityIcons name="shield-check-outline" size={16} color="#8E8E93" />
             <Text style={styles.footerNote}>Thông tin Email và Vai trò được quản lý bởi hệ thống.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centeredLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  headerContent: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  iconBtn: { minWidth: 45, justifyContent: 'center' },
  editLabel: { color: '#8e44ad', fontWeight: '600', fontSize: 16, textAlign: 'right' },
  scrollBody: { padding: 16, paddingBottom: 40 },
  profileCard: { alignItems: 'center', padding: 25, borderRadius: 28, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#F2F2F7' },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#FFF', borderRadius: 12 },
  userName: { fontSize: 22, fontWeight: '800' },
  userEmail: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  section: { marginTop: 25 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 10, marginLeft: 10, letterSpacing: 1 },
  card: { borderRadius: 24, padding: 20 },
  infoRow: { paddingVertical: 10 },
  label: { fontSize: 11, color: '#8E8E93', fontWeight: '800', marginBottom: 6 },
  value: { fontSize: 16, fontWeight: '600' },
  divider: { height: 0.4, backgroundColor: '#737375ff', marginVertical: 4 },
  footerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 30, paddingHorizontal: 40 },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#8E8E93', lineHeight: 18 }
});