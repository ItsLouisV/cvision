import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatProvider } from '@/components/chat-provider';

import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ui/toast-config';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ChatProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="flash" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="modal"
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen name="conv" />
            </Stack>
            <StatusBar style="auto" />
            <Toast config={toastConfig} position='top' topOffset={80} />
          </ThemeProvider>
        </ChatProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
