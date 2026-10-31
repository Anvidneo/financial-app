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

function toDayOfMonth(text: string): number {
  return Number(text.replace(/\D/g, '').slice(0, 2));
}

function isDayOfMonth(day: number): boolean {
  return day >= 1 && day <= 31;
}

export default function CardFormScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    listAccounts(db).then(setAccounts);
    if (debitId !== null) {
      getDebitCard(db, debitId).then((card) => {
        if (!card) return;
        setName(card.name);
        setLastFour(card.lastFour);
        setAccountId(card.accountId);
        setPurchaseCount(card.purchaseCount);
      });
    }
    if (id === null) return;

    getCard(db, id, toDay(new Date())).then((card) => {
      if (!card) return;
      setName(card.name);
      setLastFour(card.lastFour);
      setLimitCop(card.limitCop);
      setCutOffDay(card.cutOffDay);
      setPaymentDay(card.paymentDay);
      if (card.monthlyRate > 0) setRateText(card.monthlyRate.toString());
      setPurchaseCount(card.purchaseCount);
    });
  }, [db, id, debitId]);

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
        onPress: async () => {
          if (id !== null) await deleteCard(db, id);
          if (debitId !== null) await deleteDebitCard(db, debitId);
          await syncReminders(db);
          router.dismissTo('/cards');
        },
      },
    ]);
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
          {isNew ? 'New card' : 'Edit card'}
        </Text>
        <View style={styles.close} />
      </View>

      {isNew && (
        <View style={styles.types}>
          <Chip label="Credit" selected={!debit} onPress={() => setDebit(false)} />
          <Chip label="Debit" selected={debit} onPress={() => setDebit(true)} />
        </View>
      )}

      <View style={styles.form}>
        <Field label="Card name">
          <TextInput
            accessibilityLabel="Card name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Visa"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
        </Field>
        <Field label="Last 4 digits" last={debit}>
          <TextInput
            accessibilityLabel="Last 4 digits"
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={(text) => setLastFour(text.replace(/\D/g, ''))}
            placeholder="0000"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={lastFour}
          />
        </Field>
        {!debit && (
          <>
            <Field label="Credit limit">
              <TextInput
                accessibilityLabel="Credit limit"
                keyboardType="number-pad"
                onChangeText={(text) => setLimitCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
                placeholder="$0"
                placeholderTextColor={colors.muted}
                style={styles.input}
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
              <TextInput
                accessibilityLabel="Payment day"
                keyboardType="number-pad"
                onChangeText={(text) => setPaymentDay(toDayOfMonth(text))}
                placeholder="1 to 31"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={paymentDay > 0 ? paymentDay.toString() : ''}
              />
            </Field>
            <Field label="Monthly interest %" last>
              <TextInput
                accessibilityLabel="Monthly interest percent"
                keyboardType="decimal-pad"
                onChangeText={setRateText}
                placeholder="0"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={rateText}
              />
            </Field>
          </>
        )}
      </View>

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

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save card</Text>
      </PressableScale>

      {!isNew && purchaseCount === 0 && (
        <PressableScale accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
          <Text style={styles.deleteLabel}>Delete card</Text>
        </PressableScale>
      )}
    </ScrollView>
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
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.muted,
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
  delete: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
