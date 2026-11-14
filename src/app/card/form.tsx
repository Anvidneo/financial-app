import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DangerButton,
  FieldInput,
  FormField,
  FormGroup,
  FormHeader,
  FormScreen,
  SaveButton,
} from '@/components/form';
import { Chip } from '@/components/chip';
import { LoadFailed } from '@/components/load-failed';
import { colors } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import {
  addCard,
  addDebitCard,
  deleteCard,
  deleteDebitCard,
  getCard,
  getDebitCard,
  updateCard,
  updateDebitCard,
} from '@/db/cards';
import { parseRate } from '@/lib/cards';
import { toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { syncReminders } from '@/lib/reminders';
import { runAction } from '@/lib/report';
import { useLoad } from '@/lib/use-load';

function toDayOfMonth(text: string): number {
  return Number(text.replace(/\D/g, '').slice(0, 2));
}

function isDayOfMonth(day: number): boolean {
  return day >= 1 && day <= 31;
}

export default function CardFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string; debitId?: string }>();
  const id = params.id ? Number(params.id) : null;
  const debitId = params.debitId ? Number(params.debitId) : null;
  const isNew = id === null && debitId === null;
  const [debit, setDebit] = useState(debitId !== null);
  const [name, setName] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [limitCop, setLimitCop] = useState(0);
  const [cutOffDay, setCutOffDay] = useState(0);
  const [paymentDay, setPaymentDay] = useState(0);
  const [rateText, setRateText] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      setAccounts(await listAccounts(db));
      if (debitId !== null) {
        const debit = await getDebitCard(db, debitId);
        if (!debit) return;
        setName(debit.name);
        setLastFour(debit.lastFour);
        setAccountId(debit.accountId);
        setPurchaseCount(debit.purchaseCount);
        return;
      }
      if (id === null) return;
      const card = await getCard(db, id, toDay(new Date()));
      if (!card) return;
      setName(card.name);
      setLastFour(card.lastFour);
      setLimitCop(card.limitCop);
      setCutOffDay(card.cutOffDay);
      setPaymentDay(card.paymentDay);
      if (card.monthlyRate > 0) setRateText(card.monthlyRate.toString());
      setPurchaseCount(card.purchaseCount);
    }, [db, id, debitId]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  // Paid statements are stored by cut-off date, so that day can't move once the card has history.
  const cutOffLocked = purchaseCount > 0;
  const canSave =
    name.trim().length > 0 &&
    lastFour.length === 4 &&
    (debit || (limitCop > 0 && isDayOfMonth(cutOffDay) && isDayOfMonth(paymentDay))) &&
    !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const input = {
      name,
      lastFour,
      limitCop,
      cutOffDay,
      paymentDay,
      monthlyRate: parseRate(rateText),
    };
    try {
      if (debitId !== null) {
        await updateDebitCard(db, debitId, name, lastFour, accountId);
      } else if (debit) {
        await addDebitCard(db, name, lastFour, accountId);
      } else if (id === null) {
        await addCard(db, input);
      } else {
        await updateCard(db, id, input);
      }
      await syncReminders(db);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Card not saved', 'Nothing changed. Try saving again.');
    }
  }

  function confirmDelete() {
    if (id === null && debitId === null) return;
    Alert.alert(`Delete ${name}?`, 'It has no purchases, so nothing else changes.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          runAction('Card not deleted', async () => {
            if (id !== null) await deleteCard(db, id);
            if (debitId !== null) await deleteDebitCard(db, debitId);
            await syncReminders(db);
            router.dismissTo('/cards');
          }),
      },
    ]);
  }

  return (
    <FormScreen>
      <FormHeader>{isNew ? 'New card' : 'Edit card'}</FormHeader>

      {isNew && (
        <View style={styles.types}>
          <Chip label="Credit" selected={!debit} onPress={() => setDebit(false)} />
          <Chip label="Debit" selected={debit} onPress={() => setDebit(true)} />
        </View>
      )}

      <FormGroup>
        <Field label="Card name">
          <FieldInput
            accessibilityLabel="Card name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Visa"
            value={name}
          />
        </Field>
        <Field label="Last 4 digits" last={debit}>
          <FieldInput
            accessibilityLabel="Last 4 digits"
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(text) => setLastFour(text.replace(/\D/g, ''))}
            placeholder="0000"
            value={lastFour}
          />
        </Field>
        {!debit && (
          <>
            <Field label="Credit limit">
              <FieldInput
                accessibilityLabel="Credit limit"
                keyboardType="number-pad"
                onChangeText={(text) => setLimitCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
                placeholder="$0"
                value={limitCop > 0 ? formatCop(limitCop) : ''}
              />
            </Field>
            <Field label="Cut-off day">
              <TextInput
                accessibilityLabel="Cut-off day"
                editable={!cutOffLocked}
                keyboardType="number-pad"
                onChangeText={(text) => setCutOffDay(toDayOfMonth(text))}
                placeholder="1 to 31"
                placeholderTextColor={colors.muted}
                style={[styles.input, cutOffLocked && styles.locked]}
                value={cutOffDay > 0 ? cutOffDay.toString() : ''}
              />
            </Field>
            <Field label="Payment day">
              <FieldInput
                accessibilityLabel="Payment day"
                keyboardType="number-pad"
                onChangeText={(text) => setPaymentDay(toDayOfMonth(text))}
                placeholder="1 to 31"
                value={paymentDay > 0 ? paymentDay.toString() : ''}
              />
            </Field>
            <Field label="Monthly interest %" last>
              <FieldInput
                accessibilityLabel="Monthly interest percent"
                keyboardType="decimal-pad"
                onChangeText={setRateText}
                placeholder="0"
                value={rateText}
              />
            </Field>
          </>
        )}
      </FormGroup>

      {debit && accounts.length > 0 && (
        <>
          <Text style={styles.section}>Linked account</Text>
          <View style={styles.types}>
            <Chip label="None" selected={accountId === null} onPress={() => setAccountId(null)} />
            {accounts.map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                selected={accountId === account.id}
                onPress={() => setAccountId(account.id)}
              />
            ))}
          </View>
        </>
      )}

      {!debit && (
        <Text style={styles.hint}>
          {cutOffLocked
            ? 'The cut-off day is locked because this card has purchases.'
            : 'You enter the minimum payment from each statement, because banks calculate it differently.'}
        </Text>
      )}

      <SaveButton disabled={!canSave} label="Save card" onPress={save} />

      {!isNew && purchaseCount === 0 && (
        <DangerButton label="Delete card" onPress={confirmDelete} />
      )}
    </FormScreen>
  );
}

function Field({
  label,
  last = false,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <FormField label={label} divider={!last}>
      {children}
    </FormField>
  );
}

const styles = StyleSheet.create({
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minHeight: 48,
  },
  locked: {
    color: colors.muted,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
});
