import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import { getCard, payStatement, type CardWithSummary } from '@/db/cards';
import { toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { syncReminders } from '@/lib/reminders';

export default function CardPaymentScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const today = toDay(new Date());
  const [card, setCard] = useState<CardWithSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [amountCop, setAmountCop] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCard(db, id, today).then((row) => {
      setCard(row);
      setAmountCop(row?.statement.balanceCop ?? 0);
    });
    listAccounts(db).then(setAccounts);
  }, [db, id, today]);

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
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Payment not saved', 'Nothing changed. Try saving again.');
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      style={styles.screen}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.close}>
          <SymbolView name="xmark" size={16} tintColor={colors.ink} />
        </PressableScale>
        <Text accessibilityRole="header" style={styles.title}>
          Card payment
        </Text>
        <View style={styles.close} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            accessibilityLabel="Amount"
            keyboardType="number-pad"
            onChangeText={(text) => setAmountCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
            placeholder="$0"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amountCop > 0 ? formatCop(amountCop) : ''}
          />
        </View>
      </View>

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
        <Text style={styles.warning}>This is more than the {formatCop(statement.balanceCop)} due.</Text>
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

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save payment</Text>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
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
  form: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
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
  input: {
    flex: 1,
    minHeight: 48,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
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
  save: {
    height: 56,
    marginTop: 8,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    backgroundColor: colors.control,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  saveLabelDisabled: {
    color: colors.muted,
  },
});
