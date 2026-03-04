import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/themes';

export default function ActivityLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      headerShadowVisible: false, 
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.text
    }}>
      <Stack.Screen name="index" options={{ title: 'Hoạt động', headerShown: false }} />
      <Stack.Screen name="[session_id]" options={{ title: 'AI Interview', headerBackTitle: 'Lịch sử' }} />
    </Stack>
  );
}