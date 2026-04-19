import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/components/useColorScheme";
import { Colors } from "@/constants/themes";
import { supabase } from "@/lib/supabase";
import { Flame, House, Sparkles, UserRound } from "lucide-react-native";
import CreateButton from "./_create";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";
  const { user, loading: userLoading } = useCurrentUser();

  // State quản lý vai trò
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      if (!user) {
        if (!userLoading) setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setRole(data?.role || "candidate");
      } catch (error) {
        console.error("Lỗi lấy role:", error);
      } finally {
        setLoading(false);
      }
    }
    getUserRole();
  }, [user, userLoading]);

  const TAB_BAR_HEIGHT =
    Platform.OS === "ios" && insets.bottom > 0 ? 60 + insets.bottom : 68;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: colorScheme === "dark" ? "#555" : "#999",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 0.2,
          backgroundColor: isDark ? '#000' : '#F2F2F7',
          elevation: 0,
          height: TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 15,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: colorScheme === "dark" ? 0.2 : 0.05,
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <House
              color={color}
              size={24}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? color : "none"}
            />
          ),
        }}
      />

      {/* CHỈ CANDIDATE THẤY PHÂN TÍCH CV */}
      <Tabs.Screen
        name="analysis"
        options={{
          href: role === "candidate" ? "/analysis" : null,
          tabBarIcon: ({ color, focused }) => (
            <Sparkles
              color={color}
              size={24}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? color : "none"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="_create"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
        options={{
          tabBarButton: (props) => (
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
              }}
            >
              <CreateButton focused={!!props.accessibilityState?.selected} />
            </View>
          ),
        }}
      />

      {/* CHỈ CANDIDATE THẤY HOẠT ĐỘNG PHỎNG VẤN */}
      <Tabs.Screen
        name="activity"
        options={{
          href: role === "candidate" ? "/activity" : null,
          tabBarIcon: ({ color, focused }) => (
            <Flame
              color={color}
              size={26}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? color : "none"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <UserRound
              color={color}
              size={26}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? color : "none"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
