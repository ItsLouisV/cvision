import { Drawer } from "expo-router/drawer";
import { Dimensions } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/themes";
import { useDrawerProgress } from "@react-navigation/drawer";
import { useAnimatedReaction, useSharedValue, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import SidebarView from "../components/side-bar";

import { usePathname } from "expo-router";

const { width } = Dimensions.get("window");
const HAPTIC_THRESHOLD = 0.35;

function DrawerContentWithHaptic({ navigation }: any) {
  const progress = useDrawerProgress();
  const hasTriggered = useSharedValue(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous !== null && previous !== undefined) {
        // Khi kéo vượt ngưỡng → haptic
        if (current >= HAPTIC_THRESHOLD && previous < HAPTIC_THRESHOLD && !hasTriggered.value) {
          hasTriggered.value = true;
          runOnJS(triggerHaptic)();
        }
        // Reset khi đóng lại
        if (current < 0.1) {
          hasTriggered.value = false;
        }
      }
    },
  );

  return <SidebarView onClose={() => navigation.closeDrawer()} />;
}

export default function DrawerLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const pathname = usePathname();

  // Chỉ cho phép swipe mở drawer ở màn hình FeedView (Home Tab)
  // Trong expo-router, đường dẫn thư mục gốc hoặc /home thường dùng cho index của (tabs)/home
  const canSwipe = pathname === "/" || pathname === "/home";

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: width * 0.82,
          backgroundColor: theme.background,
        },
        swipeEnabled: canSwipe,
        swipeEdgeWidth: 0,
      }}
      drawerContent={(props) => (
        <DrawerContentWithHaptic navigation={props.navigation} />
      )}
    >
      <Drawer.Screen name="(tabs)" />
    </Drawer>
  );
}
