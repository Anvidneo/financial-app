import { router, type Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors } from '@/constants/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: SFSymbol; href: '/' | '/expenses' | '/recurring' | '/cards' }> = {
  index: { label: 'Home', icon: 'wallet.bifold', href: '/' },
  expenses: { label: 'Expenses', icon: 'chart.bar', href: '/expenses' },
  recurring: { label: 'Recurring', icon: 'repeat', href: '/recurring' },
  cards: { label: 'Cards', icon: 'creditcard', href: '/cards' },
};

export function FloatingTabs({ state }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { bottom: insets.bottom + 12 }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        const selected = state.index === index;
        if (!tab) return null;

        return (
          <PressableScale
            key={route.key}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.navigate(tab.href)}
            style={[styles.button, selected ? styles.selected : styles.idle]}>
            <SymbolView
              name={tab.icon}
              size={22}
              tintColor={selected ? colors.surface : colors.muted}
            />
          </PressableScale>
        );
      })}
      <PressableScale
        accessibilityLabel="Add expense"
        accessibilityRole="button"
        onPress={() => router.push('/new-expense')}
        style={[styles.button, styles.add]}>
        <SymbolView name="plus" size={22} tintColor={colors.ink} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.ink,
  },
  idle: {
    backgroundColor: colors.control,
  },
  add: {
    backgroundColor: colors.lime,
  },
});
