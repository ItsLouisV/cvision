import { Colors } from "@/constants/themes";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function InterviewLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return <Stack screenOptions={{ headerShown: false }} />;
}
