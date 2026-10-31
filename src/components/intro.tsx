import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const SPRING = { duration: 420, dampingRatio: 0.8, reduceMotion: ReduceMotion.Never };
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const START_SCALE = 0.4;
const FIRST_CARD_RISE = 58;
const SECOND_CARD_RISE = 34;
const CARD_STAGGER = 70;
const HOLD = 620;
const EXIT = 260;
const QUICK_EXIT = 180;

// Lets the Home wallet wait for the opening to clear before its cards rise.
let revealAt = Date.now() + HOLD + EXIT;

export function msUntilReveal(): number {
  return Math.max(revealAt - Date.now(), 0);
}

export function Intro() {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const scale = useSharedValue(reduced ? 1 : START_SCALE);
  const firstCard = useSharedValue(0);
  const secondCard = useSharedValue(0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    const finish = () => setDone(true);

    async function play() {
      // A payment link should reach its screen with nothing in the way.
      const url = await Linking.getInitialURL();
      const skip = url?.includes('add') ?? false;
      await SplashScreen.hideAsync();

      if (skip || reduced) {
        const exit = skip ? 0 : QUICK_EXIT;
        revealAt = Date.now() + exit;
        overlay.set(
          withTiming(0, { duration: exit, reduceMotion: ReduceMotion.Never }, () => {
            scheduleOnRN(finish);
          }),
        );
        return;
      }

      revealAt = Date.now() + HOLD + EXIT;
      scale.set(withSpring(1, SPRING));
      secondCard.set(withDelay(120, withSpring(SECOND_CARD_RISE, SPRING)));
      firstCard.set(withDelay(120 + CARD_STAGGER, withSpring(FIRST_CARD_RISE, SPRING)));
      overlay.set(
        withDelay(
          HOLD,
          withTiming(0, { duration: EXIT, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }, () => {
            scheduleOnRN(finish);
          }),
        ),
      );
    }

    play();
  }, [firstCard, overlay, reduced, scale, secondCard]);

  const backdrop = useAnimatedStyle(() => ({ opacity: overlay.get() }));
  const wallet = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() + (1 - overlay.get()) * 0.12 }],
  }));
  const first = useAnimatedStyle(() => ({ transform: [{ translateY: -firstCard.get() }] }));
  const second = useAnimatedStyle(() => ({ transform: [{ translateY: -secondCard.get() }] }));

  if (done) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
      <Animated.View style={[styles.wallet, wallet]}>
        <Animated.View style={[styles.card, styles.firstCard, first]} />
        <Animated.View style={[styles.card, styles.secondCard, second]} />
        <View style={styles.pocket}>
          <View style={styles.lip} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pocket,
  },
  wallet: {
    width: 170,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    position: 'absolute',
    bottom: 34,
    width: 136,
    height: 84,
    borderRadius: 16,
  },
  firstCard: {
    backgroundColor: colors.lime,
  },
  secondCard: {
    backgroundColor: colors.surface,
  },
  pocket: {
    width: 170,
    height: 92,
    borderRadius: 22,
    backgroundColor: '#2A4C43',
  },
  lip: {
    alignSelf: 'center',
    width: 118,
    height: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#35594F',
  },
});
