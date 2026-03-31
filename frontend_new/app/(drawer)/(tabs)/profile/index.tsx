import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, Text, View, Image, ScrollView, 
  TouchableOpacity, Switch, Alert, ActivityIndicator, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const { isAvailable, isEnabled, toggleBiometric, getBiometricLabel, getBiometricIcon, isLoading: biometricLoading } = useBiometricAuth();

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Lấy profile kèm theo thông tin công ty nếu có
        const { data } = await supabase
          .from('user_profiles')
          .select('*, employers(company_name)')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
      }}
    ]);
  };

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      {title && <Text style={styles.sectionHeader}>{title}</Text>}
      <View style={[styles.sectionBody, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
        {children}
      </View>
    </View>
  );

  const Item = ({ icon, label, color, rightElement, onPress, isLast, subLabel }: any) => (
    <TouchableOpacity 
      activeOpacity={0.6} 
      style={[styles.item, isLast && { paddingVertical: 6 }]} 
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#FFF" />
      </View>
      <View style={[styles.itemContent, { borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
          {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
        </View>
        {rightElement ? rightElement : <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />}
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator style={{flex:1}} color="#8e44ad" />;
  const isEmployer = profile?.role === 'employer';

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F2F2F7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ headerTitle: "Cài đặt", headerLargeTitle: true }} />

      {/* 1. CARD THÔNG TIN CÁ NHÂN - Link tới settings/account/index */}
      <TouchableOpacity 
        style={[styles.profileCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}
        onPress={() => router.push('/settings/account')}
      >
        <Image 
          source={{ uri: profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + profile?.full_name }} 
          style={styles.avatar} 
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: theme.text }]}>{profile?.full_name || 'Louis User'}</Text>
          <Text style={styles.subText}>{isEmployer ? (profile?.employers?.[0]?.company_name || profile?.email) : profile?.email}</Text>
          <View style={[styles.roleTag, { backgroundColor: isEmployer ? '#E3F2FD' : '#F3E5F5' }]}>
            <Text style={[styles.roleTagText, { color: isEmployer ? '#1976D2' : '#8E24AA' }]}>
               {isEmployer ? 'Premium Recruiter' : 'AI Candidate'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>

      {/* 2. CHỨC NĂNG RIÊNG THEO ROLE */}
      <Section title={isEmployer ? "Doanh nghiệp & Tuyển dụng" : "Sự nghiệp & AI"}>
        {isEmployer ? (
          <>
            <Item 
                icon="business" 
                label="Hồ sơ công ty" 
                color="#007AFF" 
                subLabel="Quản lý thông tin doanh nghiệp" 
                onPress={() => router.push('/settings/company')} 
            />
            <Item icon="newspaper" label="Quản lý tin đăng" color="#34C759" subLabel="Danh sách các bài tuyển dụng" />
            <Item icon="people" label="Tìm kiếm ứng viên AI" color="#FF9500" subLabel="Gợi ý dựa trên Machine Learning" />
            <Item icon="card" label="Gói dịch vụ & Hóa đơn" color="#5856D6" isLast />
          </>
        ) : (
          <>
            <Item icon="document-attach" label="Hồ sơ & CV" color="#5856D6" subLabel="Đã tối ưu bởi AI" onPress={() => router.push('/analysis')} />
            <Item icon="flash" label="AI Mock Interview" color="#AF52DE" subLabel="Luyện phỏng vấn với Gemini" />
            <Item icon="briefcase" label="Việc làm đã ứng tuyển" color="#34C759" onPress={() => router.push('/activity')} />
            <Item icon="analytics" label="Phân tích kỹ năng" color="#FF2D55" isLast subLabel="So sánh với thị trường" />
          </>
        )}
      </Section>

      {/* 3. CHỨC NĂNG CHUNG: BẢO MẬT & HỆ THỐNG */}
      <Section title="Bảo mật & Cá nhân hóa">
        <Item 
          icon="notifications" 
          label="Thông báo đẩy" 
          color="#FF3B30" 
          rightElement={<Switch value={notifications} onValueChange={setNotifications} />}
        />
        <Item 
          icon={getBiometricIcon()} 
          label={`Xác thực ${getBiometricLabel()}`}
          color="#000" 
          subLabel={!isAvailable ? 'Thiết bị không hỗ trợ' : undefined}
          rightElement={
            <Switch 
              value={isEnabled} 
              onValueChange={() => { toggleBiometric(); }}
              disabled={!isAvailable || biometricLoading}
            />
          }
        />
        <Item icon="lock-closed" label="Đổi mật khẩu" color="#8E8E93" onPress={() => router.push('/(auth)/reset-password')} />
        <Item icon="eye-off" label="Chế độ riêng tư" color="#5AC8FA" subLabel="Ẩn trạng thái với nhà tuyển dụng" />
        <Item icon="color-palette" label="Giao diện" color="#f458f7ff" isLast onPress={() => router.push('/settings/appearance')} />
      </Section>

      {/* 4. HỖ TRỢ & THÔNG TIN */}
      <Section title="Khác">
        <Item icon="help-circle" label="Trung tâm trợ giúp" color="#4CD964" />
        <Item icon="share-social" label="Chia sẻ ứng dụng" color="#FF2D55" />
        <Item icon="shield-checkmark" label="Điều khoản & Chính sách" color="#666" />
        <Item icon="trash" label="Xóa tài khoản" color="#FF3B30" isLast />
      </Section>

      {/* 5. ĐĂNG XUẤT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}> Copyright © 2026. Made with ❤️ by Louis Team</Text>
        <Text style={styles.version}>LOUIS AI Version 2.0.26</Text>
      </View>
      
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// ... Styles giữ nguyên như cũ của bạn
const styles = StyleSheet.create({
  section: { marginTop: 25, marginHorizontal: 16 },
  sectionHeader: { fontSize: 13, color: '#8E8E93', marginBottom: 8, marginLeft: 8, letterSpacing: 0.5 },
  sectionBody: { borderRadius: 12, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  iconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingRight: 16, marginLeft: 12 },
  itemLabel: { fontSize: 17, fontWeight: '400' },
  subLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 16, borderRadius: 16, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  avatar: { width: 65, height: 65, borderRadius: 32.5 },
  profileInfo: { flex: 1, marginLeft: 15 },
  name: { fontSize: 20, fontWeight: '700' },
  subText: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  roleTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  roleTagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  logoutBtn: { marginTop: 35, marginHorizontal: 16, backgroundColor: 'transparent', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FF3B30' },
  logoutText: { color: '#FF3B30', fontWeight: '700', fontSize: 16 },
  footer: { marginTop: 40, alignItems: 'center', marginBottom: 20 },
  footerText: { color: '#8E8E93', fontSize: 12 },
  version: { color: '#C7C7CC', fontSize: 11, fontWeight: '600', marginTop: 4 }
});