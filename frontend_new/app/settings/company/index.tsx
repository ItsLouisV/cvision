import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, ScrollView, 
  TouchableOpacity, ActivityIndicator, Linking, Platform 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { supabase } from '@/lib/supabase';
import { StatusBar } from 'expo-status-bar';

export default function CompanyProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCompanyData(); }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('employers').select('*').eq('user_id', user.id).single();
        if (data) setCompany(data);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
      <ActivityIndicator size="large" color="#8e44ad" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F8F9FB' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/settings/company/edit' as any)}
              style={styles.editPill}
            >
              <Text style={styles.editPillText}>Sửa</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <Image 
              source={{ uri: company?.company_logo || `https://ui-avatars.com/api/?name=${company?.company_name}&background=8e44ad&color=fff` }} 
              style={styles.logoImage} 
            />
            {company?.is_verified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={26} color="#8e44ad" />
              </View>
            )}
          </View>
          <Text style={[styles.companyName, { color: theme.text }]}>{company?.company_name || "Tên Công Ty"}</Text>
          
          {/* SOCIAL LINKS (Lấy từ mảng links) */}
          <View style={styles.socialRow}>
            {company?.links?.map((url: string, i: number) => {
              const { Library, name } = getLinkIcon(url);
              return (
                <TouchableOpacity key={i} onPress={() => Linking.openURL(url)} style={[styles.socialIcon, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
                  <Library name={name as any} size={20} color="#8e44ad" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. BENTO GRID (Address, Email, Created At) */}
        <View style={styles.contentPadding}>
          <View style={styles.bentoRow}>
            {/* Địa chỉ - Trụ sở chính */}
            <View style={[styles.bentoCard, { flex: 2, backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
              <Ionicons name="location-outline" size={22} color="#8e44ad" />
              <Text style={styles.bentoLabel}>TRỤ SỞ CHÍNH</Text>
              <Text style={[styles.bentoValue, { color: theme.text }]} numberOfLines={2}>{company?.address || 'Chưa cập nhật'}</Text>
            </View>
            
            {/* Thông tin phụ: Ngày tạo */}
            <View style={[styles.bentoCard, { flex: 1.2, backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
              <Ionicons name="calendar-outline" size={22} color="#8e44ad" />
              <Text style={styles.bentoLabel}>THAM GIA</Text>
              <Text style={[styles.bentoValue, { color: theme.text }]}>
                {new Date(company?.created_at).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Email Liên hệ - Card riêng biệt */}
          <View style={[styles.infoStrip, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
            <View style={styles.stripIcon}>
              <Ionicons name="mail-unread-outline" size={20} color="#8e44ad" />
            </View>
            <View>
              <Text style={styles.bentoLabel}>EMAIL LIÊN HỆ</Text>
              <Text style={[styles.stripValue, { color: theme.text }]}>{company?.contact_email || 'N/A'}</Text>
            </View>
          </View>

          {/* 4. DESCRIPTION (Giới thiệu) */}
          <Text style={styles.sectionHeader}>GIỚI THIỆU</Text>
          <View style={[styles.descCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
            <Text style={[styles.description, { color: theme.text }]}>
              {company?.company_description || "Nhà tuyển dụng chưa cập nhật thông tin giới thiệu."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper: Lấy icon dựa trên URL
const getLinkIcon = (url: string) => {
  const lowUrl = url.toLowerCase();
  if (lowUrl.includes('threads')) return { Library: FontAwesome6, name: "threads" };
  if (lowUrl.includes('facebook')) return { Library: Ionicons, name: "logo-facebook" };
  if (lowUrl.includes('linkedin')) return { Library: Ionicons, name: "logo-linkedin" };
  if (lowUrl.includes('youtube')) return { Library: Ionicons, name: "logo-youtube" };
  if (lowUrl.includes('tiktok')) return { Library: Ionicons, name: "logo-tiktok" };
  if (lowUrl.includes('instagram')) return { Library: Ionicons, name: "logo-instagram" };
  if (lowUrl.includes('twitter')) return { Library: Ionicons, name: "logo-twitter" };
  if (lowUrl.includes('github')) return { Library: Ionicons, name: "logo-github" };
  if (lowUrl.includes('website')) return { Library: Ionicons, name: "globe-outline" };
  return { Library: Ionicons, name: "globe-outline" };
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerContent: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  navBtn: { width: 40 },
  editPill: { backgroundColor: '#8e44ad', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editPillText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  scrollBody: { paddingTop: 20, paddingBottom: 40 },

  heroSection: { alignItems: 'center', marginBottom: 30 },
  logoWrapper: { position: 'relative', shadowColor: '#8e44ad', shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  logoImage: { width: 110, height: 110, borderRadius: 32, backgroundColor: '#FFF' },
  verifiedBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#FFF', borderRadius: 15, padding: 1 },
  companyName: { fontSize: 28, fontWeight: '900', marginTop: 15, letterSpacing: -1 },
  
  socialRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  socialIcon: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },

  // Bento Grid
  contentPadding: { paddingHorizontal: 20 },
  bentoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  bentoCard: { padding: 18, borderRadius: 28, gap: 8 },
  bentoLabel: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.5 },
  bentoValue: { fontSize: 15, fontWeight: '700' },

  infoStrip: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 30 },
  stripIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(142, 68, 173, 0.08)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  stripValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },

  sectionHeader: { fontSize: 13, fontWeight: '800', color: '#8E8E93', marginBottom: 15, marginLeft: 5, letterSpacing: 1 },
  descCard: { padding: 22, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 20 },
  description: { fontSize: 16, lineHeight: 26, opacity: 0.85 }
});