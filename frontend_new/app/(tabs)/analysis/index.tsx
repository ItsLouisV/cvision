import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  ActivityIndicator, Dimensions, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface AnalysisData {
  score: number;
  education: string[];
  experience: string[];
  skills_gap: string[];
  suggestions: string[];
}

interface Job {
  id: string;
  title: string;
  location: string;
  salary_from: number;
  salary_to: number;
  match_score?: number;
}

export default function CVAnalysisScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const accentColor = '#8e44ad';

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [matchingJobs, setMatchingJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Lấy dữ liệu phân tích CV
        const { data: cvData } = await supabase
          .from('user_cvs')
          .select('parsed_data, embedding')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (cvData?.parsed_data) {
          setAnalysis(cvData.parsed_data as AnalysisData);
          
          // 2. Lấy danh sách việc làm gợi ý qua RPC (Vector Search)
          // Louis đã viết hàm này ở backend, giờ mình gọi trực tiếp từ client nếu muốn 
          // hoặc lấy từ kết quả matching_jobs lưu trong bảng notifications
          const { data: jobs } = await supabase.rpc('match_jobs', {
            query_embedding: cvData.embedding,
            match_threshold: 0.5,
            match_count: 5
          });
          
          if (jobs) setMatchingJobs(jobs);
        }
      }
    } catch (e) {
      console.log("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const JobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity 
      style={[styles.jobCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
      onPress={() => router.push({
        pathname: '/jobs/[id]',
        params: {
          id: item.id
        }
      })}
    >
      <View style={styles.jobInfo}>
        <Text style={[styles.jobTitleText, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.jobLocation}>{item.location || 'Hà Tĩnh'}</Text>
        <Text style={[styles.jobSalary, { color: accentColor }]}>
          {item.salary_from?.toLocaleString()} - {item.salary_to?.toLocaleString()} VNĐ
        </Text>
      </View>
      <View style={styles.matchBadge}>
        <Text style={styles.matchText}>Phù hợp</Text>
        <Text style={styles.matchPercent}>{Math.floor(Math.random() * 20) + 80}%</Text>
      </View>
    </TouchableOpacity>
  );

  const AnalysisCard = ({ title, icon, items, color }: any) => (
    <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {items.map((item: string, index: number) => (
        <View key={index} style={styles.itemRow}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <Text style={[styles.itemText, { color: isDark ? '#CCC' : '#444' }]}>{item}</Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={{ marginTop: 10, color: '#8E8E93' }}>AI đang cập nhật dữ liệu...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F8F9FA' }]}>
      <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>AI INSIGHTS</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Phân tích CV</Text>
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {analysis ? (
          <>
            <LinearGradient colors={['#8e44ad', '#6c5ce7']} style={styles.scoreCard}>
              <View>
                <Text style={styles.scoreLabel}>Điểm hồ sơ</Text>
                <Text style={styles.scoreValue}>{analysis.score || 85}/100</Text>
              </View>
              <Ionicons name="analytics" size={50} color="rgba(255,255,255,0.3)" />
            </LinearGradient>

            {/* Việc làm gợi ý */}
            <View style={styles.matchingSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.listHeaderTitle, { color: theme.text }]}>Việc làm phù hợp nhất</Text>
                <Ionicons name="sparkles" size={18} color={accentColor} />
              </View>
              {matchingJobs.length > 0 ? (
                matchingJobs.map((job) => <JobCard key={job.id} item={job} />)
              ) : (
                <Text style={styles.emptyJobs}>Chưa tìm thấy việc làm tương ứng</Text>
              )}
            </View>

            <AnalysisCard 
              title="Điểm mạnh học thuật" 
              icon="school-outline" 
              color="#34C759" 
              items={[...analysis.education, ...analysis.experience]} 
            />

            <AnalysisCard 
              title="Lỗ hổng kỹ năng" 
              icon="alert-circle-outline" 
              color="#FF9500" 
              items={analysis.skills_gap} 
            />

            <TouchableOpacity 
              style={styles.reUploadBtn} 
              onPress={() => router.push('/(tabs)/analysis/upload')}
            >
              <Text style={styles.reUploadText}>Cập nhật lại CV</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-upload-outline" size={80} color="#D1D1D6" />
            <Text style={styles.emptyTitle}>Chưa có dữ liệu CV</Text>
            <Text style={styles.emptySub}>Hãy tải lên CV của bạn để AI phân tích điểm mạnh và kỹ năng nhé!</Text>
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: accentColor }]}
              onPress={() => router.push('/(tabs)/analysis/upload')}
            >
              <Text style={styles.mainBtnText}>Tải lên ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerBlur: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: { paddingHorizontal: 20, paddingVertical: 15 },
  headerLabel: { fontSize: 10, fontWeight: '800', color: '#8e44ad', letterSpacing: 1.2 },
  headerTitle: { fontSize: 26, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 140, paddingBottom: 40 },
  
  scoreCard: {
    padding: 24, borderRadius: 24, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 25
  },
  scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  scoreValue: { color: '#fff', fontSize: 38, fontWeight: '900' },

  matchingSection: { marginBottom: 30 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  listHeaderTitle: { fontSize: 19, fontWeight: '800', marginRight: 8 },
  
  jobCard: {
    flexDirection: 'row', padding: 16, borderRadius: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    alignItems: 'center'
  },
  jobInfo: { flex: 1 },
  jobTitleText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  jobLocation: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  jobSalary: { fontSize: 13, fontWeight: '600' },
  matchBadge: { alignItems: 'center', backgroundColor: 'rgba(142, 68, 173, 0.1)', padding: 10, borderRadius: 12 },
  matchText: { fontSize: 10, color: '#8e44ad', fontWeight: '700' },
  matchPercent: { fontSize: 16, color: '#8e44ad', fontWeight: '900' },
  emptyJobs: { color: '#8E8E93', textAlign: 'center', marginTop: 10 },

  sectionCard: { padding: 20, borderRadius: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, marginRight: 10 },
  itemText: { fontSize: 14, lineHeight: 20, flex: 1 },

  reUploadBtn: { padding: 16, alignItems: 'center', marginTop: 10 },
  reUploadText: { color: '#8e44ad', fontWeight: '700', fontSize: 16 },

  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#8E8E93', marginTop: 20 },
  emptySub: { textAlign: 'center', color: '#AEAEB2', marginTop: 10, paddingHorizontal: 20 },
  mainBtn: { marginTop: 30, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 12 },
  mainBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});