import { Drawer } from "expo-router/drawer";
import { Dimensions } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/themes";
import { useDrawerProgress } from "@react-navigation/drawer";
import { useAnimatedReaction, useSharedValue, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import SidebarView from "../components/SidebarView";

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

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: width * 0.82,
          backgroundColor: theme.background,
        },
        swipeEnabled: true,
        swipeEdgeWidth: 30,
      }}
      drawerContent={(props) => (
        <DrawerContentWithHaptic navigation={props.navigation} />
      )}
    >
      <Drawer.Screen name="(tabs)" />
    </Drawer>
  );
}
