import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PageHeader, PageScreen } from '@/components/page';
import { LoadFailed } from '@/components/load-failed';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listAccountFlows, listAccounts, type Account, type AccountFlow } from '@/db/accounts';
import { toDay, toMonth } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { useLoad } from '@/lib/use-load';

export default function AccountsScreen() {
  const db = useSQLiteContext();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flows, setFlows] = useState<AccountFlow[]>([]);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      await Promise.all([listAccounts(db), listAccountFlows(db, toMonth(toDay(new Date())))]).then(
        ([accountRows, flowRows]) => {
          setAccounts(accountRows);
          setFlows(flowRows);
        },
      );
    }, [db]),
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  const totalCop = accounts.reduce((sum, account) => sum + account.balanceCop, 0);

  return (
    <PageScreen gap={18}>
      <PageHeader
        title="Accounts"
        action={{
          icon: 'plus',
          label: 'Add account',
          onPress: () => router.push('/accounts/form'),
        }}
      />

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
    </PageScreen>
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
