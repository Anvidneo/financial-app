import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';

const PULSE = {
  from: { opacity: 1 },
  to: { opacity: 0.5 },
};
// Waiting a moment keeps a fast load from flashing the skeleton for a single frame.
const SHOW_DELAY = 100;
const FADE_DURATION = 180;

type Variant = 'home' | 'list' | 'detail';

function Bone({
  width,
  height,
  round = 8,
}: {
  width: number | `${number}%`;
  height: number;
  round?: number;
}) {
  return <View style={[styles.bone, { width, height, borderRadius: round }]} />;
}

function Rows({ count }: { count: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.row}>
          <Bone height={40} round={radius.tile} width={40} />
          <View style={styles.rowText}>
            <Bone height={14} width="55%" />
            <Bone height={11} width="35%" />
          </View>
          <Bone height={14} width={72} />
        </View>
      ))}
    </View>
  );
}

function HomeBones() {
  return (
    <>
      <View style={styles.spread}>
        <View style={styles.rowText}>
          <Bone height={14} width={110} />
          <Bone height={22} width={90} />
        </View>
        <Bone height={44} round={22} width={44} />
      </View>
      <Bone height={270} round={28} width="100%" />
      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Bone height={12} width="70%" />
          <Bone height={20} width="85%" />
        </View>
        <View style={styles.tile}>
          <Bone height={12} width="70%" />
          <Bone height={20} width="85%" />
        </View>
      </View>
      <Rows count={2} />
    </>
  );
}

function ListBones() {
  return (
    <>
      <View style={styles.centered}>
        <Bone height={18} width={120} />
      </View>
      <View style={styles.summary}>
        <Bone height={13} width={110} />
        <Bone height={32} width="55%" />
        <Bone height={84} round={radius.control} width="100%" />
      </View>
      <View style={styles.tiles}>
        <Bone height={44} round={22} width={64} />
        <Bone height={44} round={22} width={84} />
        <Bone height={44} round={22} width={84} />
      </View>
      <Rows count={4} />
    </>
  );
}

function DetailBones() {
  return (
    <>
      <View style={styles.centered}>
        <Bone height={18} width={130} />
      </View>
      <View style={styles.centered}>
        <Bone height={13} width={120} />
        <Bone height={38} width={200} />
      </View>
      <View style={styles.summary}>
        <Bone height={15} width="100%" />
        <Bone height={15} width="100%" />
        <Bone height={15} width="60%" />
      </View>
      <Rows count={3} />
    </>
  );
}

const BONES = { home: HomeBones, list: ListBones, detail: DetailBones };

export function ScreenSkeleton({ variant, root = false }: { variant: Variant; root?: boolean }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const Bones = BONES[variant];

  return (
    <View
      accessibilityLabel="Loading"
      style={[
        styles.screen,
        { paddingTop: insets.top + 12 },
        root && { paddingLeft: insets.left + 20, paddingRight: insets.right + 20 },
      ]}>
      <Animated.View entering={FadeIn.delay(SHOW_DELAY).duration(FADE_DURATION)}>
        <Animated.View
          style={[
            styles.bones,
            !reduced && {
              animationName: PULSE,
              animationDuration: 800,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            },
          ]}>
          <Bones />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function FadeInScreen({ children }: { children: ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(FADE_DURATION)} style={styles.fade}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  bones: {
    gap: 18,
  },
  fade: {
    flex: 1,
  },
  bone: {
    backgroundColor: colors.control,
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centered: {
    alignItems: 'center',
    gap: 8,
  },
  summary: {
    gap: 12,
    padding: 18,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    gap: 8,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rowText: {
    flex: 1,
    gap: 6,
  },
});
