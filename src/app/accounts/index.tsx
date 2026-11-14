import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listAccountFlows, listAccounts, type Account, type AccountFlow } from '@/db/accounts';
import { toDay, toMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';

export default function AccountsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flows, setFlows] = useState<AccountFlow[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listAccounts(db), listAccountFlows(db, toMonth(toDay(new Date())))]).then(
        ([accountRows, flowRows]) => {
          setAccounts(accountRows);
          setFlows(flowRows);
        },
      );
    }, [db]),
  );

  const totalCop = accounts.reduce((sum, account) => sum + account.balanceCop, 0);

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
          Accounts
        </Text>
        <PressableScale
          accessibilityLabel="Add account"
          accessibilityRole="button"
          onPress={() => router.push('/accounts/form')}
          style={styles.headerButton}>
          <SymbolView name="plus" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      <View style={styles.total}>
        <Text style={styles.label}>Total balance</Text>
        <Text style={styles.amount}>{formatCop(totalCop)}</Text>
      </View>

      {accounts.length > 0 && (
        <View style={styles.list}>
          {accounts.map((account, index) => (
            <PressableScale
              key={account.id}
              accessibilityRole="button"
              onPress={() => router.push(`/accounts/form?id=${account.id}`)}
              style={[styles.row, index < accounts.length - 1 && styles.divider]}>
              <View style={styles.nameColumn}>
                <Text numberOfLines={1} style={styles.name}>
                  {account.name}
                </Text>
                <FlowLine flow={flows.find((flow) => flow.accountId === account.id)} />
              </View>
              <Text style={styles.balance}>{formatCop(account.balanceCop)}</Text>
            </PressableScale>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        Income linked to an account raises its balance, and expenses and card payments lower it.
        Edit an account any time to match your bank.
      </Text>
    </ScrollView>
  );
}

function FlowLine({ flow }: { flow?: AccountFlow }) {
  if (!flow || (flow.inCop === 0 && flow.outCop === 0)) {
    return <Text style={styles.flow}>No movements this month</Text>;
  }
  return (
    <Text style={styles.flow}>
      <Text style={styles.flowIn}>+{formatCop(flow.inCop)}</Text> · −{formatCop(flow.outCop)} this
      month
    </Text>
  );
}

const styles = StyleSheet.create({
  nameColumn: {
    flex: 1,
    gap: 2,
  },
  flow: {
    fontSize: 12,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  flowIn: {
    color: colors.income,
  },
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
  label: {
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  balance: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
});
