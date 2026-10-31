import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, radius } from '@/constants/theme';
import { formatCop } from '@/lib/money';

const SPRING = { duration: 400, dampingRatio: 0.8 };
const TUCKED = 0;
const RAISED = 1;
const PEEK = 46;
const POCKET_HEIGHT = 170;
const POCKET_OVERLAP = 100;
const PALETTE = [
  { background: colors.lime, ink: colors.ink },
  { background: colors.surface, ink: colors.recurring },
  { background: '#CFE0FF', ink: colors.ink },
  { background: '#F4D9B8', ink: colors.ink },
];

export type WalletItem = {
  key: string;
  title: string;
  detail: string;
};

type Props = {
  items: WalletItem[];
  hasAccounts: boolean;
  totalCop: number;
  onEmptyPress: () => void;
};

export function Wallet({ items, hasAccounts, totalCop, onEmptyPress }: Props) {
  const reduced = useReducedMotion();
  const [raised, setRaised] = useState(true);
  const lift = useSharedValue(reduced ? RAISED : TUCKED);

  // Cards rise out of the pocket once when Home opens, then only when tapped.
  useEffect(() => {
    lift.set(withSpring(RAISED, SPRING));
  }, [lift]);

  function toggle() {
    if (items.length === 0) {
      onEmptyPress();
      return;
    }
    const next = !raised;
    setRaised(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    lift.set(withSpring(next ? RAISED : TUCKED, SPRING));
  }

  const stackHeight = items.length * PEEK;

  return (
    <Pressable
      accessibilityLabel={`Total balance ${formatCop(totalCop)}`}
      accessibilityRole="button"
      onPress={toggle}
      style={[styles.wallet, { height: stackHeight + POCKET_HEIGHT }]}>
      {items.map((item, index) => {
        const palette = PALETTE[index % PALETTE.length];
        return (
          <PeekingCard
            key={item.key}
            lift={lift}
            tucked={(items.length - index) * PEEK - 16}
            style={{ top: index * PEEK, backgroundColor: palette.background }}>
            <View style={styles.cardRow}>
              <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.ink }]}>
                {item.title}
              </Text>
              <Text style={[styles.cardDetail, { color: palette.ink }]}>{item.detail}</Text>
            </View>
          </PeekingCard>
        );
      })}
      <View style={[styles.pocket, { top: stackHeight }]}>
        <View style={styles.pocketLip} />
        <Text style={styles.total}>{formatCop(totalCop)}</Text>
        <Text style={styles.totalLabel}>
          {hasAccounts ? 'Total balance' : 'Add an account to see your balance'}
        </Text>
      </View>
    </Pressable>
  );
}

function PeekingCard({
  lift,
  tucked,
  style,
  children,
}: {
  lift: SharedValue<number>;
  tucked: number;
  style: object;
  children: React.ReactNode;
}) {
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: (RAISED - lift.get()) * tucked }],
  }));

  return <Animated.View style={[styles.card, style, animated]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wallet: {
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    width: '90%',
    height: POCKET_OVERLAP,
    borderRadius: radius.panel,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  cardDetail: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pocket: {
    position: 'absolute',
    width: '100%',
    height: POCKET_HEIGHT,
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingBottom: 22,
    gap: 4,
    justifyContent: 'flex-end',
    backgroundColor: colors.pocket,
  },
  pocketLip: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 24,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: '#24433B',
  },
  total: {
    fontSize: 30,
    fontWeight: '600',
    color: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    fontSize: 13,
    color: '#B9CCC5',
  },
});
