import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cubicBezier,
  Extrapolation,
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';

const MAX_INSTALLMENTS = 36;
const ITEM_WIDTH = 56;
const COUNTS = Array.from({ length: MAX_INSTALLMENTS }, (_, index) => index + 1);
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export function InstallmentPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Animated.View layout={LinearTransition.duration(200)} style={styles.card}>
      <PressableScale
        accessibilityLabel={`Installments, ${value}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.row}>
        <Text style={styles.label}>Installments</Text>
        <View style={styles.value}>
          <Text style={styles.valueText}>{value}</Text>
          <Animated.View
            style={{
              transform: [{ rotate: open ? '180deg' : '0deg' }],
              transitionProperty: 'transform',
              transitionDuration: 180,
              transitionTimingFunction: EASE_OUT,
            }}>
            <SymbolView name="chevron.down" size={13} tintColor={colors.muted} />
          </Animated.View>
        </View>
      </PressableScale>

      {open && <Counter value={value} onChange={onChange} />}
    </Animated.View>
  );
}

function Counter({ value, onChange }: Props) {
  const reduced = useReducedMotion();
  const scroller = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [width, setWidth] = useState(0);
  // Set once: updating it with each new value would stop the scroll before it snaps.
  const [startOffset] = useState({ x: (value - 1) * ITEM_WIDTH, y: 0 });
  const x = useSharedValue(startOffset.x);

  function select(count: number) {
    if (count === value) return;
    Haptics.selectionAsync();
    onChange(count);
  }

  function scrollTo(count: number) {
    scroller.current?.scrollTo({ x: (count - 1) * ITEM_WIDTH, animated: true });
  }

  const onScroll = useAnimatedScrollHandler((event) => {
    x.set(event.contentOffset.x);
  });

  useAnimatedReaction(
    () => Math.min(Math.max(Math.round(x.get() / ITEM_WIDTH) + 1, 1), MAX_INSTALLMENTS),
    (count, previous) => {
      if (previous !== null && count !== previous) scheduleOnRN(select, count);
    },
  );

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(120)}
      style={styles.counter}>
      <StepButton
        disabled={value === 1}
        icon="minus"
        label="Fewer installments"
        onPress={() => scrollTo(value - 1)}
      />

      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.carousel}>
        <View pointerEvents="none" style={styles.selection} />
        {width > 0 && (
          <Animated.ScrollView
            ref={scroller}
            horizontal
            contentContainerStyle={{ paddingHorizontal: (width - ITEM_WIDTH) / 2 }}
            contentOffset={startOffset}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}>
            {COUNTS.map((count) => (
              <CounterNumber
                key={count}
                count={count}
                reduced={reduced}
                x={x}
                onPress={() => scrollTo(count)}
              />
            ))}
          </Animated.ScrollView>
        )}
      </View>

      <StepButton
        disabled={value === MAX_INSTALLMENTS}
        icon="plus"
        label="More installments"
        onPress={() => scrollTo(value + 1)}
      />
    </Animated.View>
  );
}

function CounterNumber({
  count,
  reduced,
  x,
  onPress,
}: {
  count: number;
  reduced: boolean;
  x: SharedValue<number>;
  onPress: () => void;
}) {
  const center = (count - 1) * ITEM_WIDTH;
  const range = [center - ITEM_WIDTH, center, center + ITEM_WIDTH];

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), range, [0.55, 1, 0.55], Extrapolation.CLAMP),
    transform: [
      { scale: reduced ? 1 : interpolate(x.get(), range, [0.72, 1, 0.72], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Pressable accessibilityLabel={`${count} installments`} onPress={onPress} style={styles.number}>
      <Animated.Text style={[styles.numberText, style]}>{count}</Animated.Text>
    </Pressable>
  );
}

function StepButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.step}>
      <SymbolView name={icon} size={16} tintColor={disabled ? colors.control : colors.ink} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
  },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carousel: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selection: {
    position: 'absolute',
    alignSelf: 'center',
    width: ITEM_WIDTH,
    height: 56,
    borderRadius: radius.control,
    backgroundColor: colors.background,
  },
  number: {
    width: ITEM_WIDTH,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
});
