import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Strong, SummaryCard, TabTitle } from '@/components/tab-parts';
import { CategoryTile } from '@/components/category-tile';
import { Chip } from '@/components/chip';
import { useTabRail } from '@/components/floating-tabs';
import { LoadFailed } from '@/components/load-failed';
import { PressableScale } from '@/components/pressable-scale';
import { FadeInScreen, ScreenSkeleton } from '@/components/skeleton';
import { ChargeStatus } from '@/components/status-label';
import { colors, radius, status } from '@/constants/theme';
import { listRecurringIncomes, type RecurringIncome } from '@/db/incomes';
import { listRecurring, type Recurring } from '@/db/recurring';
import { daysBetween } from '@/lib/billing';
import { formatDay, toDay } from '@/lib/dates';
import { incomeKind } from '@/lib/income';
import { formatCop } from '@/lib/money';
import { remindersAllowed } from '@/lib/reminders';
import { useLoad } from '@/lib/use-load';

export default function RecurringScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const rail = useTabRail();
  const today = toDay(new Date());
  const [items, setItems] = useState<Recurring[]>([]);
  const [incomes, setIncomes] = useState<RecurringIncome[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      await Promise.all([
        listRecurring(db, today),
        remindersAllowed(),
        listRecurringIncomes(db, today),
      ]).then(([rows, permission, incomeRows]) => {
        setItems(rows);
        setIncomes(incomeRows);
        setAllowed(permission);
        setLoaded(true);
      });
    }, [db, today]),
  );

  const categories = useMemo(() => [...new Set(items.map((item) => item.categoryName))], [items]);
  const visible = items.filter((item) => category === null || item.categoryName === category);
  const monthly = items.reduce((sum, item) => sum + item.amountCop, 0);
  const nextWeek = items
    .filter((item) => daysBetween(today, item.nextChargeOn) <= 7)
    .reduce((sum, item) => sum + item.amountCop, 0);

  if (failed) return <LoadFailed onRetry={retry} />;
  if (!loaded) return <ScreenSkeleton variant="list" />;

  const header = (
    <View style={styles.header}>
      <TabTitle
        title="Recurring"
        add={{ label: 'Add recurring', onPress: () => router.push('/recurring/form') }}
      />

      {items.length > 0 && (
        <>
          <SummaryCard label="Every month" amount={formatCop(monthly)}>
            {items.length} active · <Strong>{formatCop(nextWeek)}</Strong> in the next 7 days
          </SummaryCard>

          {!allowed && (
            <PressableScale
              accessibilityRole="button"
              onPress={() => Linking.openSettings()}
              style={styles.off}>
              <Text style={styles.offTitle}>Reminders are off</Text>
              <Text style={styles.summaryLabel}>
                Tap to allow notifications in iPhone Settings.
              </Text>
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
    <FadeInScreen>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        ListFooterComponent={
          incomes.length > 0 && category === null ? (
            <View style={styles.incomes}>
              <Text style={styles.incomeTitle}>Monthly income</Text>
              <View style={styles.incomeList}>
                {incomes.map((income, index) => (
                  <IncomeRow key={income.id} income={income} last={index === incomes.length - 1} />
                ))}
              </View>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="No recurring charges yet"
            text="Add a subscription or service and get a reminder before each charge."
            action={{ label: 'Add recurring', onPress: () => router.push('/recurring/form') }}
          />
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
          paddingBottom: rail.contentBottom,
          paddingHorizontal: 20,
        }}
        style={styles.screen}
      />
    </FadeInScreen>
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
        <CategoryTile
          icon={item.categoryIcon}
          color={item.categoryColor}
          tint={item.categoryTint}
        />
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

function IncomeRow({ income, last }: { income: RecurringIncome; last: boolean }) {
  const kind = incomeKind(income.kind);

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/income/form?recurringId=${income.id}`)}
      style={[styles.incomeRow, !last && styles.incomeDivider]}>
      <CategoryTile icon={kind.icon} color={colors.income} tint={status.ok.background} />
      <View style={styles.incomeText}>
        <Text numberOfLines={1} style={styles.incomeName}>
          {income.source}
        </Text>
        <Text style={styles.incomeDetail}>
          Day {income.payDay}
          {income.accountName ? ` · ${income.accountName}` : ''}
        </Text>
      </View>
      <View style={styles.incomeAmount}>
        <Text style={[styles.incomeName, styles.incomeValue]}>+{formatCop(income.amountCop)}</Text>
        <Text style={styles.incomeDetail}>Next {formatDay(income.nextPayOn)}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  incomes: {
    gap: 10,
    marginTop: 22,
  },
  incomeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  incomeList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  incomeDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  incomeText: {
    flex: 1,
    gap: 2,
  },
  incomeAmount: {
    alignItems: 'flex-end',
    gap: 2,
  },
  incomeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  incomeValue: {
    color: colors.income,
  },
  incomeDetail: {
    fontSize: 12,
    color: colors.muted,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 18,
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.muted,
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
});
