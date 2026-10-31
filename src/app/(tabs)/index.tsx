import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { Chip } from '@/components/chip';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCategories, listExpenses, type Category, type Expense } from '@/db/expenses';
import { addMonths, formatDay, formatMonth, toDay, toMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { paymentLabel } from '@/lib/payment';

export default function ExpensesScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const currentMonth = toMonth(toDay(new Date()));
  const [month, setMonth] = useState(currentMonth);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useFocusEffect(
    useCallback(() => {
      listCategories(db).then(setCategories);
      listExpenses(db, month, categoryId).then(setExpenses);
    }, [db, month, categoryId]),
  );

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amountCop, 0),
    [expenses],
  );

  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        Expenses
      </Text>

      <View style={styles.summary}>
        <View style={styles.monthRow}>
          <MonthButton
            icon="chevron.left"
            label="Previous month"
            onPress={() => setMonth(addMonths(month, -1))}
          />
          <Text style={styles.month}>{formatMonth(month)}</Text>
          <MonthButton
            icon="chevron.right"
            label="Next month"
            disabled={month === currentMonth}
            onPress={() => setMonth(addMonths(month, 1))}
          />
        </View>
        <Text style={styles.total}>{formatCop(total)}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}>
        <Chip label="All" selected={categoryId === null} onPress={() => setCategoryId(null)} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ScrollView>

      {expenses.length > 0 && <Text style={styles.section}>Movements</Text>}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={expenses}
        keyExtractor={(expense) => expense.id.toString()}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyMovements filtered={categoryId !== null} />}
        renderItem={({ item, index }) => (
          <ExpenseRow
            expense={item}
            first={index === 0}
            last={index === expenses.length - 1}
          />
        )}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 20,
        }}
      />
    </View>
  );
}

function MonthButton({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: 'chevron.left' | 'chevron.right';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.monthButton}>
      <SymbolView
        name={icon}
        size={16}
        tintColor={disabled ? colors.control : colors.muted}
      />
    </PressableScale>
  );
}

function ExpenseRow({
  expense,
  first,
  last,
}: {
  expense: Expense;
  first: boolean;
  last: boolean;
}) {
  const paid = paymentLabel(expense.paymentMethod, expense.cardLabel);

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/expense/${expense.id}`)}
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
      <View style={[styles.rowInner, !last && styles.rowDivider]}>
        <CategoryTile
          icon={expense.categoryIcon}
          color={expense.categoryColor}
          tint={expense.categoryTint}
        />
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.rowName}>
            {expense.merchant}
          </Text>
          <Text style={styles.rowDetail}>
            {expense.categoryName}
            {paid ? ` · ${paid}` : ''}
            {expense.recurring ? <Text style={styles.recurring}> · Recurring</Text> : null}
          </Text>
        </View>
        <View style={styles.rowAmount}>
          <Text style={styles.rowName}>{formatCop(expense.amountCop)}</Text>
          <Text style={styles.rowDetail}>{formatDay(expense.spentOn)}</Text>
        </View>
      </View>
    </PressableScale>
  );
}

function EmptyMovements({ filtered }: { filtered: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {filtered ? 'No movements in this category' : 'No movements this month'}
      </Text>
      <Text style={styles.emptyText}>Add one with the green plus button.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 18,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 44,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 18,
    gap: 4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -10,
    marginVertical: -8,
  },
  month: {
    fontSize: 13,
    color: colors.muted,
  },
  monthButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  chipScroller: {
    marginHorizontal: -20,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  row: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  rowFirst: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingTop: 4,
  },
  rowLast: {
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    paddingBottom: 4,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowAmount: {
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
  empty: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
  recurring: {
    color: colors.recurring,
  },
});
