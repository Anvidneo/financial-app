import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader, PageScreen } from '@/components/page';
import { CategoryTile } from '@/components/category-tile';
import { LoadFailed } from '@/components/load-failed';
import { MonthBars } from '@/components/month-bars';
import { PressableScale } from '@/components/pressable-scale';
import { FadeInScreen, ScreenSkeleton } from '@/components/skeleton';
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
import { useLoad } from '@/lib/use-load';

export default function CategoryDetailScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string; month?: string }>();
  const id = Number(params.id);
  const month = params.month ?? toMonth(toDay(new Date()));
  const months = useMemo(() => lastMonths(month, 5), [month]);
  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState<number[]>([]);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      const [row, rows, monthTotals] = await Promise.all([
        getCategory(db, id),
        listExpenses(db, month, id),
        listMonthTotals(db, months, id),
      ]);
      setCategory(row);
      setExpenses(rows);
      setTotals(monthTotals);
    }, [db, id, month, months]),
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  if (!category) return <ScreenSkeleton variant="detail" />;

  return (
    <FadeInScreen>
      <PageScreen gap={14}>
        <PageHeader
          title={category.name}
          action={{
            icon: 'pencil',
            label: 'Edit category',
            onPress: () => router.push(`/category/form?id=${id}`),
          }}
        />

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
                  <CategoryTile icon={category.icon} color={category.color} tint={category.tint} />
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
      </PageScreen>
    </FadeInScreen>
  );
}

const styles = StyleSheet.create({
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
