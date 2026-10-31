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

type Props = {
  account: { name: string; balanceCop: number } | null;
  card: { name: string; lastFour: string } | null;
  totalCop: number;
  onEmptyPress: () => void;
};

export function Wallet({ account, card, totalCop, onEmptyPress }: Props) {
  const reduced = useReducedMotion();
  const [raised, setRaised] = useState(true);
  const lift = useSharedValue(reduced ? RAISED : TUCKED);

  // Cards rise out of the pocket once when Home opens, then only when tapped.
  useEffect(() => {
    lift.set(withSpring(RAISED, SPRING));
  }, [lift]);

  function toggle() {
    if (!account && !card) {
      onEmptyPress();
      return;
    }
    const next = !raised;
    setRaised(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    lift.set(withSpring(next ? RAISED : TUCKED, SPRING));
  }

  return (
    <Pressable
      accessibilityLabel={`Total balance ${formatCop(totalCop)}`}
      accessibilityRole="button"
      onPress={toggle}
      style={styles.wallet}>
      {account && (
        <PeekingCard lift={lift} tucked={58} style={styles.accountCard}>
          <View style={styles.cardRow}>
            <Text numberOfLines={1} style={styles.accountName}>
              {account.name}
            </Text>
          </View>
          <Text style={styles.accountBalance}>{formatCop(account.balanceCop)}</Text>
        </PeekingCard>
      )}
      {card && (
        <PeekingCard lift={lift} tucked={36} style={styles.creditCard}>
          <View style={styles.cardRow}>
            <Text style={styles.cardDigits}>•••• {card.lastFour}</Text>
            <Text numberOfLines={1} style={styles.cardName}>
              {card.name}
            </Text>
          </View>
        </PeekingCard>
      )}
      <View style={styles.pocket}>
        <View style={styles.pocketLip} />
        <Text style={styles.total}>{formatCop(totalCop)}</Text>
        <Text style={styles.totalLabel}>
          {account ? 'Total balance' : 'Add an account to see your balance'}
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
    height: 270,
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    width: '90%',
    height: 150,
    borderRadius: radius.panel,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 4,
  },
  accountCard: {
    top: 0,
    backgroundColor: colors.lime,
  },
  creditCard: {
    top: 56,
    backgroundColor: colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2A14',
  },
  accountBalance: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  cardDigits: {
    fontSize: 16,
    letterSpacing: 3,
    color: colors.recurring,
  },
  cardName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.recurring,
  },
  pocket: {
    position: 'absolute',
    top: 100,
    width: '100%',
    height: 170,
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
