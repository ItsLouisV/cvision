import { Stack } from 'expo-router'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/themes'

export default function ProfileLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <Stack>
            <Stack.Screen 
                name="index" 
                options={{ 
                    title: 'Settings',
                    headerShown: true,
                    headerLargeTitleEnabled: true,
                }} 
            />
        </Stack>
    )
}
