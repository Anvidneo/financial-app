import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';

export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Couldn't load this screen
      </Text>
      <Text style={styles.text}>Your data is safe. Try again in a moment.</Text>
      <PressableScale accessibilityRole="button" onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryLabel}>Try again</Text>
      </PressableScale>
      {router.canGoBack() && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}>
          <Text style={styles.backLabel}>Go back</Text>
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  retry: {
    marginTop: 12,
    minWidth: 160,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
  back: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
});
