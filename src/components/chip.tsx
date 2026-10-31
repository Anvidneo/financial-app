import { StyleSheet, Text } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { colors } from '@/constants/theme';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <PressableScale accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? colors.ink : colors.surface,
            borderColor: selected ? colors.ink : colors.line,
            transitionProperty: ['backgroundColor', 'borderColor'],
            transitionDuration: 160,
            transitionTimingFunction: EASE_OUT,
          },
        ]}>
        <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    color: colors.ink,
  },
  selectedLabel: {
    color: colors.surface,
    fontWeight: '600',
  },
});
