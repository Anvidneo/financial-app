import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingTabs } from '@/components/floating-tabs';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabs {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: {
          backgroundColor: colors.background,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="expenses" />
      <Tabs.Screen name="recurring" />
      <Tabs.Screen name="cards" />
    </Tabs>
  );
}
