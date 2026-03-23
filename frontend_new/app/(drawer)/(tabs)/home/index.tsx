// app/(drawer)/(tabs)/home/index.tsx
import { DrawerActions, useNavigation } from "@react-navigation/native";
import FeedView from "./FeedView";

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <FeedView
      onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}
