// app/(drawer)/(tabs)/home/index.tsx
import React, { useState } from "react";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import FeedView from "./FeedView";
import FollowingFeed from "../../followingFeed"; // File Louis vừa tạo lúc nãy
import { View, StyleSheet } from "react-native";
// import { SegmentedControl } from "@/components/ui/segmented-control"; // Sẽ tạo ở bước dưới

export default function HomeScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');

  return (
    <View style={{ flex: 1 }}>
      {/* Louis có thể truyền activeTab vào FeedView để nó tự lọc 
         Hoặc render 2 component riêng biệt cho sạch code 
      */}
      <FeedView
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
    </View>
  );
}