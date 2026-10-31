import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const DURATION = 180;

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function Toggle({ label, value, onChange }: Props) {
  const reduced = useReducedMotion();

  function toggle() {
    Haptics.selectionAsync();
    onChange(!value);
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={7}
      onPress={toggle}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: value ? '#2E7D4F' : '#8A928D',
            transitionProperty: 'backgroundColor',
            transitionDuration: DURATION,
            transitionTimingFunction: EASE_OUT,
          },
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: value ? 20 : 0 }],
              transitionProperty: 'transform',
              transitionDuration: reduced ? 0 : DURATION,
              transitionTimingFunction: EASE_OUT,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
});
