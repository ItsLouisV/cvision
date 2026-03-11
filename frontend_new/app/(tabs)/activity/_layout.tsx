import { Colors } from "@/constants/themes";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function ActivityLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Hoạt động", headerShown: false }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Tạo buổi phỏng vấn",
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
