import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import { formatCop } from '@/lib/money';

export default function AccountsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useFocusEffect(
    useCallback(() => {
      listAccounts(db).then(setAccounts);
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
              <Text numberOfLines={1} style={styles.name}>
                {account.name}
              </Text>
              <Text style={styles.balance}>{formatCop(account.balanceCop)}</Text>
            </PressableScale>
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        Expenses and card payments linked to an account lower its balance. Edit an account any
        time to match your bank.
      </Text>
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
