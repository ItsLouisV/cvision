import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/themes';

export default function ChatLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  
  return (
    <Stack screenOptions={
      { 
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? '#000' : '#f2f2f7' },
      }}>
      <Stack.Screen name="index"
        options={{ 
          gestureEnabled: false, 
          animation: 'fade' 
        }}/>
      <Stack.Screen name="upload" />
    </Stack>
  )
}