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
                    title: 'Cài đặt',
                    headerShown: true,
                    headerLargeTitleEnabled: true,
                    headerLargeTitleStyle: { color: theme.text },
                    headerTitleStyle: { color: theme.text },
                    headerLargeTitle: true,
                    headerTransparent: true,
                    headerLargeTitleShadowVisible: false,
                }} 
            />
        </Stack>
    )
}
