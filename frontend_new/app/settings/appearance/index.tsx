import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  useColorScheme as useNativeColorScheme, Appearance,
  Dimensions,
  Platform,
  Switch
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRouter } from 'expo-router';
import { Colors } from '@/constants/themes';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function AppearanceScreen() {
  const router = useRouter();
  const systemColorScheme = useNativeColorScheme();
  const isDark = systemColorScheme === 'dark';
  const theme = Colors[systemColorScheme ?? 'light'];

  const [selectedMode, setSelectedMode] = useState<'light' | 'dark' | 'system'>('system');

  // Khi vào màn hình, đọc dữ liệu đã lưu từ máy
  useEffect(() => {
    const loadSavedMode = async () => {
      const savedMode = await AsyncStorage.getItem('user-theme');
      if (savedMode) {
        setSelectedMode(savedMode as any);
      }
    };
    loadSavedMode();
  }, []);

  const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
    setSelectedMode(mode);

    // Lưu mode vào AsyncStorage
    await AsyncStorage.setItem('user-theme', mode);

    if (mode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }

    // const isDark = systemColorScheme === 'dark';
    // const theme = Colors[systemColorScheme ?? 'light'];
  };

  // Component con mô phỏng giao diện
  const ThemeCard = ({ mode, label }: { mode: 'light' | 'dark' | 'system', label: string }) => {
    const isActive = selectedMode === mode;
    
    return (
      <TouchableOpacity
        activeOpacity={0.3} 
        onPress={() => handleThemeChange(mode)}
        style={styles.cardContainer}
      >
        <View style={[
          styles.previewCard, 
          mode === 'dark' ? styles.darkPreview : styles.lightPreview,
          isActive && { borderColor: '#8e44ad', borderWidth: 3 }
        ]}>
          {/* Mô phỏng các dòng text/UI bên trong card */}
          <View style={[styles.mockLine, { backgroundColor: mode === 'dark' ? '#3A3A3C' : '#E5E5EA', width: '60%' }]} />
          <View style={[styles.mockLine, { backgroundColor: mode === 'dark' ? '#3A3A3C' : '#E5E5EA', width: '80%' }]} />
          <View style={[styles.mockButton, { backgroundColor: '#8e44ad' }]} />
          
          {isActive && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#8e44ad" />
            </View>
          )}
        </View>
        <Text style={[styles.cardLabel, { color: theme.text, fontWeight: isActive ? '700' : '500' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F2F2F7' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <SafeAreaView edges={['top']} style={[styles.headerContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Giao diện</Text>
          <View style={{ width: 45 }} /> 
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>CHẾ ĐỘ HIỂN THỊ</Text>
        
        <View style={styles.cardsRow}>
          <ThemeCard mode="light" label="Sáng" />
          <ThemeCard mode="dark" label="Tối" />
        </View>

        <TouchableOpacity 
          activeOpacity={0.3}
          style={[styles.systemOption, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}
          onPress={() => handleThemeChange('system')}
        >
            <View style={styles.optionLeft}>
                <Ionicons name="settings-outline" size={22} color={isDark ? '#FFF' : '#000'} />
                <Text style={[styles.optionText, { color: theme.text }]}>Tự động theo hệ thống</Text>
            </View>
            {/* <Switch
                value={selectedMode === 'system'}
                onValueChange={(value) => {
                if (value) {
                    handleThemeChange('system');
                } else {
                    // Khi tắt Switch, mặc định quay về chế độ Sáng (hoặc chế độ hiện tại của máy)
                    handleThemeChange('light');
                }
                }}
                trackColor={{ false: '#767577', true: '#33de36ff' }} 
                thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
            /> */}
            <Ionicons 
                name={selectedMode === 'system' ? "radio-button-on" : "radio-button-off"} 
                size={22} 
                color={selectedMode === 'system' ? "#8e44ad" : "#C7C7CC"} 
            />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          CVision sẽ tự động điều chỉnh màu sắc để tối ưu trải nghiệm đọc và tiết kiệm pin cho thiết bị của bạn.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  headerContent: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  iconBtn: { minWidth: 45 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '700', marginBottom: 20, letterSpacing: 1 },
  
  cardsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  cardContainer: { width: (width - 60) / 2, alignItems: 'center' },
  previewCard: { width: '100%', height: 160, borderRadius: 20, padding: 15, justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  lightPreview: { backgroundColor: '#FFFFFF', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  darkPreview: { backgroundColor: '#1C1C1E', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  
  mockLine: { height: 8, borderRadius: 4, marginBottom: 10 },
  mockButton: { height: 24, borderRadius: 12, marginTop: 10, width: '40%' },
  checkBadge: { position: 'absolute', top: -10, right: -10, backgroundColor: '#FFF', borderRadius: 15 },
  cardLabel: { marginTop: 12, fontSize: 15 },

  systemOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 20, marginTop: 10 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { fontSize: 16, fontWeight: '600' },
  
  footerNote: { marginTop: 25, textAlign: 'center', fontSize: 13, color: '#8E8E93', paddingHorizontal: 20, lineHeight: 20 }
});