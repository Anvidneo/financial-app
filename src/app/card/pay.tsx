import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FieldInput, FormGroup, FormHeader, FormScreen, SaveButton } from '@/components/form';
import { Chip } from '@/components/chip';
import { LoadFailed } from '@/components/load-failed';
import { colors } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import { getCard, payStatement, type CardWithSummary } from '@/db/cards';
import { toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { syncReminders } from '@/lib/reminders';
import { useLoad } from '@/lib/use-load';

export default function CardPaymentScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const today = toDay(new Date());
  const [card, setCard] = useState<CardWithSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [amountCop, setAmountCop] = useState(0);
  const [saving, setSaving] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      const [row, rows] = await Promise.all([getCard(db, id, today), listAccounts(db)]);
      setCard(row);
      setAmountCop(row?.statement.balanceCop ?? 0);
      setAccounts(rows);
    }, [db, id, today]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  if (!card) return <View style={styles.screen} />;

  const { statement } = card;
  const canSave = amountCop > 0 && amountCop <= statement.balanceCop && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await payStatement(db, {
        cardId: id,
        cutOffOn: statement.cutOffOn,
        amountCop,
        accountId,
        paidOn: today,
        settled: amountCop === statement.balanceCop,
      });
      await syncReminders(db);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Payment not saved', 'Nothing changed. Try saving again.');
    }
  }

  return (
    <FormScreen>
      <FormHeader>Card payment</FormHeader>

      <FormGroup>
        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <FieldInput
            accessibilityLabel="Amount"
            keyboardType="number-pad"
            onChangeText={(text) => setAmountCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
            placeholder="$0"
            value={amountCop > 0 ? formatCop(amountCop) : ''}
          />
        </View>
      </FormGroup>

      <View style={styles.quickAmounts}>
        <Chip
          label="Full balance"
          selected={amountCop === statement.balanceCop}
          onPress={() => setAmountCop(statement.balanceCop)}
        />
        {statement.minimumCop !== null && statement.minimumCop < statement.balanceCop && (
          <Chip
            label="Minimum"
            selected={amountCop === statement.minimumCop}
            onPress={() => setAmountCop(statement.minimumCop ?? 0)}
          />
        )}
      </View>

      {amountCop > statement.balanceCop && (
        <Text style={styles.warning}>
          This is more than the {formatCop(statement.balanceCop)} due.
        </Text>
      )}

      {accounts.length > 0 && (
        <>
          <Text style={styles.section}>Paid from</Text>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.scroller}>
            <Chip
              label="No account"
              selected={accountId === null}
              onPress={() => setAccountId(null)}
            />
            {accounts.map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                selected={accountId === account.id}
                onPress={() => setAccountId(account.id)}
              />
            ))}
          </ScrollView>
        </>
      )}

      <SaveButton disabled={!canSave} label="Save payment" onPress={save} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  scroller: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  warning: {
    fontSize: 13,
    color: colors.danger,
  },
});
