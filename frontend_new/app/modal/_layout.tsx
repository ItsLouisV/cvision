import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ModalLayout() {
    const colorScheme = useColorScheme();

    return (
        <>
            <Stack 
                screenOptions={{ 
                headerShown: false, 
                }} 
            />
            {/* Tự động điều chỉnh màu chữ Status Bar theo theme hệ thống */}
            <StatusBar style='auto' />
        </>
    );
}