import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

export function PressableScale({ style, onPressIn, onPressOut, ...props }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        scale.set(withTiming(0.97, { duration: 100, easing: EASE_OUT }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, { duration: 160, easing: EASE_OUT }));
        onPressOut?.(event);
      }}
      style={[style, animated]}
    />
  );
}
