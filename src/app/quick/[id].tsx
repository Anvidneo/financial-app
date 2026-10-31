import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { PressableScale } from '@/components/pressable-scale';
import { FadeInScreen, ScreenSkeleton } from '@/components/skeleton';
import { colors, radius, status } from '@/constants/theme';
import {
  deleteExpense,
  getExpense,
  listCategories,
  setExpenseCategory,
  type Category,
  type Expense,
} from '@/db/expenses';
import { formatCop } from '@/lib/money';
import { paymentLabel } from '@/lib/payment';
import { syncReminders } from '@/lib/reminders';

export default function QuickConfirmScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    getExpense(db, id).then((row) => {
      if (row) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setExpense(row);
      setCategoryId(row?.categoryId ?? null);
    });
    listCategories(db).then(setCategories);
  }, [db, id]);

  if (!expense) return <ScreenSkeleton variant="detail" />;

  async function choose(category: number) {
    setCategoryId(category);
    await setExpenseCategory(db, id, category);
  }

  async function discard() {
    await deleteExpense(db, id);
    await syncReminders(db);
    router.replace('/');
  }

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 12 }]}>
      <Animated.View entering={FadeInDown.duration(240)} style={styles.summary}>
        <View style={styles.saved}>
          <Text style={styles.savedLabel}>Saved</Text>
        </View>
        <Text accessibilityRole="header" style={styles.amount}>
          {formatCop(expense.amountCop)}
        </Text>
        <Text numberOfLines={2} style={styles.merchant}>
          {expense.merchant}
        </Text>
        <Text style={styles.paid}>
          {paymentLabel(expense.paymentMethod, expense.cardLabel) ?? 'Payment method not set'}
        </Text>
      </Animated.View>

      <Text style={styles.section}>Category</Text>
      <View style={styles.grid}>
        {categories.map((category) => (
          <PressableScale
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: categoryId === category.id }}
            onPress={() => choose(category.id)}
            style={[styles.category, categoryId === category.id && styles.selected]}>
            <CategoryTile icon={category.icon} color={category.color} tint={category.tint} />
            <Text numberOfLines={1} style={styles.categoryName}>
              {category.name}
            </Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.spacer} />

      <PressableScale
        accessibilityRole="button"
        onPress={() => router.replace('/')}
        style={styles.done}>
        <Text style={styles.doneLabel}>Done</Text>
      </PressableScale>
      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push(`/new-expense?id=${id}`)}
          style={styles.action}>
          <Text style={styles.editLabel}>Edit details</Text>
        </PressableScale>
        <PressableScale accessibilityRole="button" onPress={discard} style={styles.action}>
          <Text style={styles.discardLabel}>Not an expense</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    gap: 14,
  },
  summary: {
    alignItems: 'center',
    gap: 6,
  },
  saved: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: status.ok.background,
  },
  savedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: status.ok.text,
  },
  amount: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  paid: {
    fontSize: 14,
    color: colors.muted,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  category: {
    width: '31%',
    flexGrow: 1,
    height: 92,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selected: {
    borderColor: colors.ink,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  spacer: {
    flex: 1,
  },
  done: {
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  discardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
