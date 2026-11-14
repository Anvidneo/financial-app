import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';

// Pieces the list tabs share: a centered title with an add button, a summary card, an empty state.

type Action = { label: string; onPress: () => void };

export function TabTitle({ title, add }: { title: string; add: Action }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleButton} />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <PressableScale
        accessibilityLabel={add.label}
        accessibilityRole="button"
        onPress={add.onPress}
        style={styles.titleButton}>
        <SymbolView name="plus" size={18} tintColor={colors.ink} />
      </PressableScale>
    </View>
  );
}

export function SummaryCard({
  label,
  amount,
  children,
}: {
  label: string;
  amount: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.total}>{amount}</Text>
      {children ? <Text style={styles.summaryLabel}>{children}</Text> : null}
    </View>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <Text style={styles.strong}>{children}</Text>;
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: Action;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <PressableScale
        accessibilityRole="button"
        onPress={action.onPress}
        style={styles.emptyButton}>
        <Text style={styles.emptyButtonLabel}>{action.label}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 18,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  strong: {
    fontWeight: '600',
    color: colors.ink,
  },
  total: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 96,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    height: 56,
    marginTop: 10,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});
