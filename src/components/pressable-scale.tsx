import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

export function PressableScale({ style, ...props }: Props) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [style, pressed && { transform: [{ scale: 0.97 }] }]}
    />
  );
}
