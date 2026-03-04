
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';

export default function Index() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            // 1. Lấy session hiện tại từ AsyncStorage
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.log("❌ Lỗi lấy Session:", error.message);
            }

            if (currentSession) {
                console.log("✅ ĐÃ TÌM THẤY SESSION!");
                console.log("--- CHI TIẾT SESSION ---");
                console.log("📧 Email:", currentSession.user.email);
                console.log("👤 Role trong Metadata:", currentSession.user.user_metadata?.role);
                console.log("🔑 Access Token (rất dài):", currentSession.access_token.substring(0, 50) + "...");
                console.log("⏳ Hết hạn vào:", new Date(currentSession.expires_at! * 1000).toLocaleString());
                console.log("-----------------------");
            } else {
                console.log("ℹ️ Chưa có Session (Người dùng chưa đăng nhập)");
            }

            setSession(currentSession);
            setLoading(false);
        };

        checkSession();

        // Lắng nghe nếu user logout hoặc login ở chỗ khác
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("🔔 Trạng thái Auth thay đổi:", _event);
            setSession(session);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" color="#8e44ad" />
            <Text style={{ marginTop: 10, color: '#8e44ad' }}>Đang kiểm tra phiên làm việc...</Text>
          </View>
        );
    }

    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    return <Redirect href="/(tabs)/home" />;
}