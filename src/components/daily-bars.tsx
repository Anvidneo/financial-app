import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import type { DayTotal } from '@/db/expenses';
import { formatDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';

const CHART_HEIGHT = 140;
const GRID_LINES = 4;
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const LABEL_DAYS = [1, 8, 15, 22];

type Props = {
  days: DayTotal[];
  selected: string | null;
  onSelect: (day: string | null) => void;
};

export function DailyBars({ days, selected, onSelect }: Props) {
  const reduced = useReducedMotion();
  const highest = Math.max(...days.map((day) => day.cardCop + day.otherCop), 1);
  const transition = {
    transitionProperty: 'height',
    transitionDuration: reduced ? 0 : 220,
    transitionTimingFunction: EASE_OUT,
  } as const;

  function height(amount: number) {
    return amount > 0 ? Math.max((amount / highest) * CHART_HEIGHT, 3) : 0;
  }

  return (
    <View>
      <View style={styles.plot}>
        {Array.from({ length: GRID_LINES }, (_, index) => (
          <View
            key={index}
            style={[styles.gridLine, { bottom: ((index + 1) / GRID_LINES) * CHART_HEIGHT }]}
          />
        ))}
        <View style={styles.baseline} />

        <View style={styles.columns}>
          {days.map((day) => {
            const total = day.cardCop + day.otherCop;
            const dimmed = selected !== null && selected !== day.day;

            return (
              <Pressable
                key={day.day}
                accessibilityRole="button"
                accessibilityLabel={`${formatDay(day.day)}, ${formatCop(total)}`}
                accessibilityState={{ selected: selected === day.day }}
                disabled={total === 0}
                hitSlop={{ top: 8, bottom: 8 }}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelect(selected === day.day ? null : day.day);
                }}
                style={[styles.column, dimmed && styles.dimmed]}>
                <Animated.View
                  style={[
                    styles.segment,
                    styles.other,
                    { height: height(day.otherCop) },
                    day.cardCop > 0 && day.otherCop > 0 && styles.stacked,
                    transition,
                  ]}
                />
                <Animated.View
                  style={[styles.segment, styles.card, { height: height(day.cardCop) }, transition]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.labels}>
        {days.map((day, index) => (
          <View key={day.day} style={styles.labelSlot}>
            {LABEL_DAYS.includes(index + 1) && (
              <Text numberOfLines={1} style={styles.label}>
                {formatDay(day.day)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ChartLegend() {
  return (
    <View style={styles.legend}>
      <LegendItem color={colors.credit} label="Credit card" />
      <LegendItem color={colors.paidNow} label="Paid now" />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: CHART_HEIGHT,
    marginTop: 14,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.line,
  },
  columns: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 1.5,
  },
  dimmed: {
    opacity: 0.3,
  },
  segment: {
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  stacked: {
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.credit,
  },
  other: {
    backgroundColor: colors.paidNow,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  labelSlot: {
    flex: 1,
    overflow: 'visible',
    alignItems: 'flex-start',
  },
  label: {
    width: 44,
    fontSize: 11,
    color: colors.muted,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 13,
    color: colors.muted,
  },
});
