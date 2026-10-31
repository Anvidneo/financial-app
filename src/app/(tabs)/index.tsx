import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabRail } from '@/components/floating-tabs';
import { CategoryTile } from '@/components/category-tile';
import { PressableScale } from '@/components/pressable-scale';
import { ChargeStatus } from '@/components/status-label';
import { Wallet } from '@/components/wallet';
import { colors, radius, status } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import { listCards, listDebitCards, type CardWithSummary } from '@/db/cards';
import { listMonthTotals } from '@/db/expenses';
import { listRecurring, type Recurring } from '@/db/recurring';
import { getSetting, setSetting } from '@/db/settings';
import { formatDay, greeting, toDay, toMonth } from '@/lib/dates';
import { installDaysLeft, readInstallExpiry, WARNING_DAYS } from '@/lib/install';
import { formatCop } from '@/lib/money';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const rail = useTabRail();
  const now = new Date();
  const today = toDay(now);
  const month = toMonth(today);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CardWithSummary[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [spentCop, setSpentCop] = useState(0);
  const [name, setName] = useState('');
  const [expiresOn, setExpiresOn] = useState<string | null>(null);
  const [hasDebit, setHasDebit] = useState(false);
  const [setupHidden, setSetupHidden] = useState(true);

  useFocusEffect(
    useCallback(() => {
      listAccounts(db).then(setAccounts);
      listCards(db, today).then(setCards);
      listRecurring(db, today).then(setRecurring);
      listMonthTotals(db, [month], null).then(([total]) => setSpentCop(total));
      listDebitCards(db).then((rows) => setHasDebit(rows.length > 0));
      getSetting(db, 'name').then((value) => setName(value ?? ''));
      getSetting(db, 'setupHidden').then((value) => setSetupHidden(value !== null));
      getSetting(db, 'welcomed').then((value) => {
        if (value === null) router.replace('/welcome');
      });
      readInstallExpiry().then(setExpiresOn);
    }, [db, today, month]),
  );

  const totalCop = accounts.reduce((sum, account) => sum + account.balanceCop, 0);
  const nextCard = cards
    .filter((card) => card.statement.balanceCop > 0)
    .sort((a, b) => a.statement.dueOn.localeCompare(b.statement.dueOn))[0];

  const walletItems = [
    ...accounts.map((account) => ({
      key: `account-${account.id}`,
      title: account.name,
      detail: formatCop(account.balanceCop),
    })),
    ...cards.map((card) => ({
      key: `card-${card.id}`,
      title: card.name,
      detail: `•••• ${card.lastFour}`,
    })),
  ];
  const setupSteps = [
    { done: accounts.length > 0, label: 'Add an account', href: '/accounts/form' },
    { done: cards.length > 0 || hasDebit, label: 'Add a card', href: '/card/form' },
    { done: recurring.length > 0, label: 'Add a recurring charge', href: '/recurring/form' },
  ] as const;
  const missingSteps = setupSteps.filter((step) => !step.done);
  const daysLeft = expiresOn ? installDaysLeft(expiresOn, today) : null;

  function hideSetup() {
    setSetupHidden(true);
    setSetting(db, 'setupHidden', '1');
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: rail.contentBottom },
      ]}
      style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>{greeting(now.getHours())}</Text>
          {name.length > 0 && (
            <Text accessibilityRole="header" style={styles.name}>
              {name}
            </Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          <PressableScale
            accessibilityLabel="Accounts"
            accessibilityRole="button"
            onPress={() => router.push('/accounts')}
            style={styles.headerButton}>
            <SymbolView name="building.columns" size={20} tintColor={colors.ink} />
          </PressableScale>
          <PressableScale
            accessibilityLabel="Reminders"
            accessibilityRole="button"
            onPress={() => router.push('/reminders')}
            style={styles.headerButton}>
            <SymbolView name="bell" size={20} tintColor={colors.ink} />
          </PressableScale>
          <PressableScale
            accessibilityLabel="Settings"
            accessibilityRole="button"
            onPress={() => router.push('/settings')}
            style={styles.headerButton}>
            <SymbolView name="gearshape" size={20} tintColor={colors.ink} />
          </PressableScale>
        </View>
      </View>

      {daysLeft !== null && expiresOn && daysLeft <= WARNING_DAYS && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={styles.expiry}>
          <Text style={styles.expiryTitle}>Reinstall by {formatDay(expiresOn)}</Text>
          <Text style={styles.expiryText}>
            Back up, then run the install from your Mac over this app.
          </Text>
        </PressableScale>
      )}

      <Wallet
        items={walletItems}
        hasAccounts={accounts.length > 0}
        totalCop={totalCop}
        onEmptyPress={() => router.push('/accounts/form')}
      />

      <View style={styles.tiles}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/expenses')}
          style={styles.tile}>
          <Text style={styles.tileLabel}>Spent this month</Text>
          <Text style={styles.tileValue}>{formatCop(spentCop)}</Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push(nextCard ? `/card/${nextCard.id}` : '/cards')}
          style={styles.tile}>
          <Text style={styles.tileLabel}>
            {nextCard ? `Card due ${formatDay(nextCard.statement.dueOn)}` : 'Card due'}
          </Text>
          <Text style={styles.tileValue}>
            {formatCop(nextCard?.statement.balanceCop ?? 0)}
          </Text>
        </PressableScale>
      </View>

      {!setupHidden && missingSteps.length > 0 && (
        <View style={styles.list}>
          <View style={styles.setupHeader}>
            <Text style={styles.setupTitle}>Finish setting up</Text>
            <PressableScale accessibilityRole="button" onPress={hideSetup} style={styles.seeAll}>
              <Text style={styles.seeAllLabel}>Hide</Text>
            </PressableScale>
          </View>
          {missingSteps.map((step, index) => (
            <PressableScale
              key={step.label}
              accessibilityRole="button"
              onPress={() => router.push(step.href)}
              style={[styles.setupRow, index < missingSteps.length - 1 && styles.divider]}>
              <Text style={styles.rowName}>{step.label}</Text>
              <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
            </PressableScale>
          ))}
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Upcoming charges</Text>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/recurring')}
          style={styles.seeAll}>
          <Text style={styles.seeAllLabel}>See all</Text>
        </PressableScale>
      </View>

      {recurring.length === 0 ? (
        <Text style={styles.nothing}>Add subscriptions and services in Recurring.</Text>
      ) : (
        <View style={styles.list}>
          {recurring.slice(0, 3).map((item, index, shown) => (
            <PressableScale
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(`/recurring/${item.id}`)}
              style={[styles.row, index < shown.length - 1 && styles.divider]}>
              <CategoryTile
                icon={item.categoryIcon}
                color={item.categoryColor}
                tint={item.categoryTint}
              />
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.rowName}>
                  {item.name}
                </Text>
                <Text style={styles.rowDetail}>{item.categoryName}</Text>
              </View>
              <View style={styles.rowAmount}>
                <Text style={styles.rowName}>{formatCop(item.amountCop)}</Text>
                <ChargeStatus nextChargeOn={item.nextChargeOn} lastPaidOn={null} today={today} />
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
  greeting: {
    gap: 2,
  },
  hello: {
    fontSize: 14,
    color: colors.muted,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiry: {
    gap: 2,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: status.warn.background,
  },
  expiryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: status.warn.text,
  },
  expiryText: {
    fontSize: 13,
    color: status.warn.text,
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  tiles: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    gap: 6,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  tileLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -8,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  seeAll: {
    minHeight: 44,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  seeAllLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.pocket,
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
    paddingVertical: 10,
  },
  divider: {
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
