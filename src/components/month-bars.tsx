import { StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { formatShortMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';

const BAR_HEIGHT = 84;
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type Props = {
  months: string[];
  totals: number[];
  color?: string;
};

export function MonthBars({ months, totals, color = colors.credit }: Props) {
  const highest = Math.max(...totals, 1);
  const reduced = useReducedMotion();

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
            <View style={styles.slot}>
              <Animated.View
                style={[
                  styles.bar,
                  current && { backgroundColor: color },
                  {
                    height: Math.max((total / highest) * BAR_HEIGHT, total > 0 ? 4 : 0),
                    transitionProperty: 'height',
                    transitionDuration: reduced ? 0 : 220,
                    transitionTimingFunction: EASE_OUT,
                  },
                ]}
              />
            </View>
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
  slot: {
    height: BAR_HEIGHT,
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
