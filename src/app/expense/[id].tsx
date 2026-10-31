import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { deleteExpense, getExpense, type Expense } from '@/db/expenses';
import { formatDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';

export default function ExpenseDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const [expense, setExpense] = useState<Expense | null>(null);

  useFocusEffect(
    useCallback(() => {
      getExpense(db, id).then(setExpense);
    }, [db, id]),
  );

  if (!expense) return <View style={styles.screen} />;

  function confirmDelete() {
    Alert.alert(
      `Delete ${expense?.merchant}?`,
      expense?.recurring
        ? 'This removes it from your history. The recurring charge stays active.'
        : 'This removes it from your history.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(db, id);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </PressableScale>
        <Text accessibilityRole="header" style={styles.title}>
          Movement
        </Text>
        <PressableScale
          accessibilityLabel="Edit movement"
          accessibilityRole="button"
          onPress={() => router.push(`/new-expense?id=${id}`)}
          style={styles.headerButton}>
          <SymbolView name="pencil" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      <View style={styles.summary}>
        <CategoryTile
          icon={expense.categoryIcon}
          color={expense.categoryColor}
          tint={expense.categoryTint}
        />
        <Text numberOfLines={2} style={styles.merchant}>
          {expense.merchant}
        </Text>
        <Text style={styles.amount}>{formatCop(expense.amountCop)}</Text>
        {expense.recurring ? <Text style={styles.recurring}>Recurring</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={[styles.detail, styles.divider]}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{expense.categoryName}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDay(expense.spentOn)}</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <PressableScale accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
        <Text style={styles.deleteLabel}>Delete movement</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
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
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  merchant: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  amount: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  recurring: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.recurring,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  spacer: {
    flex: 1,
  },
  delete: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
