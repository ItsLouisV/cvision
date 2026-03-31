import { Stack } from 'expo-router';

export default function EmployerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="expired-job" />
      <Stack.Screen name="edit-job" />
    </Stack>
  );
}