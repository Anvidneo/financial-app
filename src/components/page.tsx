import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors } from '@/constants/theme';

// The frame shared by screens pushed on top of the tabs: a back button, a title and one action.

export function PageScreen({ gap = 16, children }: { gap?: number; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { gap, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
      style={styles.screen}>
      {children}
    </ScrollView>
  );
}

type Action = { icon: 'plus' | 'pencil'; label: string; onPress: () => void };

export function PageHeader({ title, action }: { title: ReactNode; action?: Action }) {
  return (
    <View style={styles.header}>
      <HeaderButton icon="chevron.left" label="Back" onPress={() => router.back()} />
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {action ? <HeaderButton {...action} /> : <View style={styles.button} />}
    </View>
  );
}

function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron.left' | Action['icon'];
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}>
      <SymbolView name={icon} size={18} tintColor={colors.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
});
