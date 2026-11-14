import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { colors } from '@/constants/theme';

type Entry = 'expense' | 'income';

const ROUTES: Record<Entry, '/new-expense' | '/income/form'> = {
  expense: '/new-expense',
  income: '/income/form',
};

// Swaps the open form in place, so the plus button stays one tap away from an expense.
export function EntrySwitch({ value }: { value: Entry }) {
  return (
    <View accessibilityRole="tablist" style={styles.switch}>
      {(['expense', 'income'] as const).map((option) => {
        const selected = value === option;
        return (
          <PressableScale
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            disabled={selected}
            onPress={() => {
              Haptics.selectionAsync();
              router.replace(ROUTES[option]);
            }}
            style={[styles.option, selected && styles.selected]}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {option === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.control,
  },
  option: {
    minWidth: 84,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  selectedLabel: {
    color: colors.ink,
  },
});
