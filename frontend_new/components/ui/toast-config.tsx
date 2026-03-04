import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';

const { width } = Dimensions.get('window');

const BaseToast = ({ text1, text2, type }: any) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // Định nghĩa màu sắc và icon cho từng loại
  const config = {
    success: {
      icon: 'checkmark-circle',
      color: '#4CD964', // Màu xanh iOS
      accent: '#8e44ad', // Màu tím AI của Louis để tạo điểm nhấn
    },
    error: {
      icon: 'alert-circle',
      color: '#FF3B30', // Màu đỏ iOS
      accent: '#FF3B30',
    },
    info: {
      icon: 'information-circle',
      color: '#007AFF',
      accent: '#007AFF',
    }
  };

  const currentConfig = config[type as keyof typeof config] || config.success;

  return (
    <BlurView 
      intensity={isDark ? 40 : 20} 
      tint={isDark ? 'dark' : 'light'} 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.7)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
        }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: currentConfig.color + '20' }]}>
        <Ionicons name={currentConfig.icon as any} size={24} color={currentConfig.color} />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {text1}
        </Text>
        {text2 && (
          <Text style={[styles.subtitle, { color: isDark ? '#8E8E93' : '#636366' }]} numberOfLines={2}>
            {text2}
          </Text>
        )}
      </View>
    </BlurView>
  );
};

export const toastConfig = {
  success: (props: any) => <BaseToast {...props} type="success" />,
  error: (props: any) => <BaseToast {...props} type="error" />,
  info: (props: any) => <BaseToast {...props} type="info" />,
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    // Đổ bóng cho iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // Đổ bóng cho Android
    elevation: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.8,
  }
});