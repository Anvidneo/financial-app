import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCategoryTotals, type CategoryTotal } from '@/db/expenses';
import { formatMonth, toDay, toMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month ?? toMonth(toDay(new Date()));
  const [totals, setTotals] = useState<CategoryTotal[]>([]);

  useFocusEffect(
    useCallback(() => {
      listCategoryTotals(db, month).then(setTotals);
    }, [db, month]),
  );

  const totalCop = totals.reduce((sum, category) => sum + category.totalCop, 0);

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
        <Text accessibilityRole="header" style={styles.title}>
          Categories
        </Text>
        <PressableScale
          accessibilityLabel="Add category"
          accessibilityRole="button"
          onPress={() => router.push('/category/form')}
          style={styles.headerButton}>
          <SymbolView name="plus" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      <View style={styles.total}>
        <Text style={styles.month}>{formatMonth(month)}</Text>
        <Text style={styles.amount}>{formatCop(totalCop)}</Text>
      </View>

      {totals.length > 0 && (
        <View style={styles.list}>
          {totals.map((category, index) => (
            <PressableScale
              key={category.id}
              accessibilityRole="button"
              onPress={() => router.push(`/category/${category.id}?month=${month}`)}
              style={[styles.row, index < totals.length - 1 && styles.divider]}>
              <CategoryTile icon={category.icon} color={category.color} tint={category.tint} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowText}>{category.name}</Text>
                  <Text style={styles.rowText}>{formatCop(category.totalCop)}</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${totalCop > 0 ? (category.totalCop / totalCop) * 100 : 0}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </PressableScale>
          ))}
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
  total: {
    alignItems: 'center',
    gap: 6,
  },
  month: {
    fontSize: 13,
    color: colors.muted,
  },
  amount: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
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
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.control,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
