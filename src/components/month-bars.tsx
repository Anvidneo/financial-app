import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { formatShortMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';

const BAR_HEIGHT = 84;

type Props = {
  months: string[];
  totals: number[];
  color?: string;
};

export function MonthBars({ months, totals, color = colors.credit }: Props) {
  const highest = Math.max(...totals, 1);

  return (
    <View style={styles.chart}>
      {months.map((month, index) => {
        const total = totals[index] ?? 0;
        const current = index === months.length - 1;

        return (
          <View
            key={month}
            accessible
            accessibilityLabel={`${formatShortMonth(month)}, ${formatCop(total)}`}
            style={styles.column}>
            <View
              style={[
                styles.bar,
                current && { backgroundColor: color },
                { height: Math.max((total / highest) * BAR_HEIGHT, total > 0 ? 4 : 0) },
              ]}
            />
            <Text style={[styles.label, current && styles.currentLabel]}>
              {formatShortMonth(month)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    height: BAR_HEIGHT + 24,
    marginTop: 10,
  },
  column: {
    flex: 1,
    alignItems: 'stretch',
    gap: 6,
  },
  bar: {
    borderRadius: 8,
    backgroundColor: '#DDE4F7',
  },
  label: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  currentLabel: {
    fontWeight: '600',
    color: colors.ink,
  },
});
