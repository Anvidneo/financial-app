import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader, PageScreen } from '@/components/page';
import { CategoryTile } from '@/components/category-tile';
import { LoadFailed } from '@/components/load-failed';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCategoryTotals, type CategoryTotal } from '@/db/expenses';
import { formatMonth, toDay, toMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { useLoad } from '@/lib/use-load';

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month ?? toMonth(toDay(new Date()));
  const [totals, setTotals] = useState<CategoryTotal[]>([]);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      setTotals(await listCategoryTotals(db, month));
    }, [db, month]),
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  const totalCop = totals.reduce((sum, category) => sum + category.totalCop, 0);

  return (
    <PageScreen gap={18}>
      <PageHeader
        title="Categories"
        action={{
          icon: 'plus',
          label: 'Add category',
          onPress: () => router.push('/category/form'),
        }}
      />

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
    </PageScreen>
  );
}

const styles = StyleSheet.create({
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
