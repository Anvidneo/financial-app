import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { Chip } from '@/components/chip';
import { PressableScale } from '@/components/pressable-scale';
import { ChargeStatus } from '@/components/status-label';
import { colors, radius } from '@/constants/theme';
import { listRecurring, type Recurring } from '@/db/recurring';
import { daysBetween } from '@/lib/billing';
import { toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { remindersAllowed } from '@/lib/reminders';

export default function RecurringScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const today = toDay(new Date());
  const [items, setItems] = useState<Recurring[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);

  useFocusEffect(
    useCallback(() => {
      listRecurring(db, today).then(setItems);
      remindersAllowed().then(setAllowed);
    }, [db, today]),
  );

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.categoryName))],
    [items],
  );
  const visible = items.filter((item) => category === null || item.categoryName === category);
  const monthly = items.reduce((sum, item) => sum + item.amountCop, 0);
  const nextWeek = items
    .filter((item) => daysBetween(today, item.nextChargeOn) <= 7)
    .reduce((sum, item) => sum + item.amountCop, 0);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleButton} />
        <Text accessibilityRole="header" style={styles.title}>
          Recurring
        </Text>
        <PressableScale
          accessibilityLabel="Add recurring"
          accessibilityRole="button"
          onPress={() => router.push('/recurring/form')}
          style={styles.titleButton}>
          <SymbolView name="plus" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      {items.length > 0 && (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Every month</Text>
            <Text style={styles.total}>{formatCop(monthly)}</Text>
            <Text style={styles.summaryLabel}>
              {items.length} active ·{' '}
              <Text style={styles.summaryStrong}>{formatCop(nextWeek)}</Text> in the next 7 days
            </Text>
          </View>

          {!allowed && (
            <PressableScale
              accessibilityRole="button"
              onPress={() => Linking.openSettings()}
              style={styles.off}>
              <Text style={styles.offTitle}>Reminders are off</Text>
              <Text style={styles.summaryLabel}>Tap to allow notifications in iPhone Settings.</Text>
            </PressableScale>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroller}>
            <Chip label="All" selected={category === null} onPress={() => setCategory(null)} />
            {categories.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={category === name}
                onPress={() => setCategory(name)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id.toString()}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No recurring charges yet</Text>
          <Text style={styles.emptyText}>
            Add a subscription or service and get a reminder before each charge.
          </Text>
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.push('/recurring/form')}
            style={styles.emptyButton}>
            <Text style={styles.emptyButtonLabel}>Add recurring</Text>
          </PressableScale>
        </View>
      }
      renderItem={({ item, index }) => (
        <RecurringRow
          item={item}
          today={today}
          first={index === 0}
          last={index === visible.length - 1}
        />
      )}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 110,
        paddingHorizontal: 20,
      }}
      style={styles.screen}
    />
  );
}

function RecurringRow({
  item,
  today,
  first,
  last,
}: {
  item: Recurring;
  today: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/recurring/${item.id}`)}
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
      <View style={[styles.rowInner, !last && styles.rowDivider]}>
        <CategoryTile icon={item.categoryIcon} color={item.categoryColor} tint={item.categoryTint} />
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.rowName}>
            {item.name}
          </Text>
          <Text style={styles.rowDetail}>
            Day {item.billingDay} · {item.categoryName}
          </Text>
        </View>
        <View style={styles.rowAmount}>
          <Text style={styles.rowName}>{formatCop(item.amountCop)}</Text>
          <ChargeStatus
            nextChargeOn={item.nextChargeOn}
            lastPaidOn={item.lastPaidOn}
            today={today}
          />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 18,
    marginBottom: 18,
  },
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
  summaryStrong: {
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
  off: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    gap: 2,
  },
  offTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  chipScroller: {
    marginHorizontal: -20,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
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
    gap: 4,
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
