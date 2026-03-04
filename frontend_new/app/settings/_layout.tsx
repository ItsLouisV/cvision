import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack screenOptions={{ 
            headerShown: false,
            headerBackTitle: "Back",
            headerTintColor: '#8e44ad',
            headerStyle: { backgroundColor: 'transparent' },
        }}>
            <Stack.Screen name="account" options={{ headerTitle: "Tài khoản" }} />
            <Stack.Screen name="company" options={{ headerTitle: "Công ty" }} />
        </Stack>
    );
}