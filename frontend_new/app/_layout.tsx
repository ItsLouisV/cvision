import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { ChatProvider } from "@/components/chat-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { toastConfig } from "@/components/ui/toast-config";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ChatProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(drawer)" />
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen name="jobs" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="interview" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="histories" />
              <Stack.Screen name="analysis_history" />
              <Stack.Screen name="employer" />
              <Stack.Screen name="search" />
            </Stack>
            <StatusBar style="auto" />
            <Toast config={toastConfig} position="top" topOffset={60} />
          </ThemeProvider>
        </ChatProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
