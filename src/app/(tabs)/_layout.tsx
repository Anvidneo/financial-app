import { Tabs } from 'expo-router';

import { FloatingTabs } from '@/components/floating-tabs';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabs {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="recurring" />
      <Tabs.Screen name="cards" />
    </Tabs>
  );
}
