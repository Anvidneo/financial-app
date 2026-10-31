import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { MonthBars } from '@/components/month-bars';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import {
  getCategory,
  listExpenses,
  listMonthTotals,
  type Category,
  type Expense,
} from '@/db/expenses';
import { formatDay, formatMonth, lastMonths, toDay, toMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { paymentLabel } from '@/lib/payment';

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; month?: string }>();
  const id = Number(params.id);
  const month = params.month ?? toMonth(toDay(new Date()));
  const months = useMemo(() => lastMonths(month, 5), [month]);
  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCategory(db, id).then(setCategory);
      listExpenses(db, month, id).then(setExpenses);
      listMonthTotals(db, months, id).then(setTotals);
    }, [db, id, month, months]),
  );

  if (!category) return <View style={styles.screen} />;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
      style={styles.screen}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </PressableScale>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {category.name}
        </Text>
        <PressableScale
          accessibilityLabel="Edit category"
          accessibilityRole="button"
          onPress={() => router.push(`/category/form?id=${id}`)}
          style={styles.headerButton}>
          <SymbolView name="pencil" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      <View style={styles.summary}>
        <Text style={styles.month}>{formatMonth(month)}</Text>
        <Text style={styles.total}>{formatCop(totals[totals.length - 1] ?? 0)}</Text>
        <MonthBars color={category.color} months={months} totals={totals} />
      </View>

      <Text style={styles.section}>Movements</Text>
      {expenses.length === 0 ? (
        <Text style={styles.nothing}>No movements this month.</Text>
      ) : (
        <View style={styles.list}>
          {expenses.map((expense, index) => {
            const paid = paymentLabel(expense.paymentMethod, expense.cardLabel);
            return (
              <PressableScale
                key={expense.id}
                accessibilityRole="button"
                onPress={() => router.push(`/expense/${expense.id}`)}
                style={[styles.row, index < expenses.length - 1 && styles.divider]}>
                <CategoryTile
                  icon={category.icon}
                  color={category.color}
                  tint={category.tint}
                />
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.rowName}>
                    {expense.merchant}
                  </Text>
                  <Text style={styles.rowDetail}>{paid ?? 'No payment method'}</Text>
                </View>
                <View style={styles.rowEnd}>
                  <Text style={styles.rowName}>{formatCop(expense.amountCop)}</Text>
                  <Text style={styles.rowDetail}>{formatDay(expense.spentOn)}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
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
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  summary: {
    gap: 4,
    padding: 18,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
  },
  month: {
    fontSize: 13,
    color: colors.muted,
  },
  total: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  nothing: {
    fontSize: 14,
    color: colors.muted,
  },
  list: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowEnd: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rowDetail: {
    fontSize: 12,
    color: colors.muted,
  },
});
