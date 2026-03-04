import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/themes';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';

interface CreateButtonProps {
  focused?: boolean;
}

const CreateButton = ({ focused }: CreateButtonProps) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    // Rung nhẹ khi nhấn (Haptic Feedback) kiểu iOS
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Mở modal
    router.push('/modal/create-post');
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={handlePress}
      style={styles.container}
    >
      <View style={[
        styles.button, 
        { 
          backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
          borderColor: focused ? theme.tint : 'transparent',
        }
      ]}>
        <Plus  
          size={28} 
          strokeWidth={3}
          color='#5d5d5d'
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    top: -3, // Nhích lên một chút cho cân đối
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 50,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});

export default CreateButton;