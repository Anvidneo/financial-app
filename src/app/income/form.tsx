import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  DangerButton,
  DayStepper,
  FieldInput,
  FormField,
  FormGroup,
  FormHeader,
  FormScreen,
  SaveButton,
} from '@/components/form';
import { Chip } from '@/components/chip';
import { EntrySwitch } from '@/components/entry-switch';
import { Keypad } from '@/components/keypad';
import { LoadFailed } from '@/components/load-failed';
import { Toggle } from '@/components/toggle';
import { colors } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import {
  addIncome,
  addRecurringIncome,
  deleteIncome,
  getIncome,
  getRecurringIncome,
  stopRecurringIncome,
  updateIncome,
  updateRecurringIncome,
} from '@/db/incomes';
import { addDays, formatDay, formatRelativeDay, toDay } from '@/lib/dates';
import { INCOME_KINDS, type IncomeKind } from '@/lib/income';
import { appendDigits, formatCop, removeLastDigit } from '@/lib/money';
import { runAction } from '@/lib/report';
import { useLoad } from '@/lib/use-load';

export default function IncomeFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string; recurringId?: string }>();
  const id = params.id ? Number(params.id) : null;
  const recurringId = params.recurringId ? Number(params.recurringId) : null;
  const creating = id === null && recurringId === null;
  const today = toDay(new Date());
  const [amountCop, setAmountCop] = useState(0);
  const [source, setSource] = useState('');
  const [receivedOn, setReceivedOn] = useState(today);
  const [payDay, setPayDay] = useState(Number(today.slice(8)));
  const [kind, setKind] = useState<IncomeKind>('salary');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [repeats, setRepeats] = useState(false);
  const [saving, setSaving] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      const rows = await listAccounts(db);
      setAccounts(rows);
      if (creating) setAccountId(rows[0]?.id ?? null);
      const income =
        id !== null
          ? await getIncome(db, id)
          : recurringId !== null
            ? await getRecurringIncome(db, recurringId, today)
            : null;
      if (!income) return;
      setAmountCop(income.amountCop);
      setSource(income.source);
      setKind(income.kind);
      setAccountId(income.accountId);
      if ('receivedOn' in income) setReceivedOn(income.receivedOn);
      if ('payDay' in income) setPayDay(income.payDay);
    }, [db, id, recurringId, creating, today]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  const canSave = amountCop > 0 && source.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const income = { source, amountCop, kind, accountId };
      if (recurringId !== null) {
        await updateRecurringIncome(db, recurringId, { ...income, payDay });
      } else if (id !== null) {
        await updateIncome(db, id, { ...income, receivedOn });
      } else if (repeats) {
        await addRecurringIncome(
          db,
          { ...income, payDay: Number(receivedOn.slice(8)) },
          receivedOn,
        );
      } else {
        await addIncome(db, { ...income, receivedOn });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Income not saved', 'Nothing changed. Try saving again.');
    }
  }

  function remove() {
    if (recurringId !== null) {
      Alert.alert(
        'Stop repeating?',
        'Payments already received stay in your history and balances.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop repeating',
            style: 'destructive',
            onPress: () =>
              runAction('Income not changed', async () => {
                await stopRecurringIncome(db, recurringId);
                router.back();
              }),
          },
        ],
      );
      return;
    }
    if (id === null) return;
    Alert.alert('Delete this income?', 'The account balance goes back down by this amount.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          runAction('Income not changed', async () => {
            await deleteIncome(db, id);
            router.back();
          }),
      },
    ]);
  }

  return (
    <FormScreen>
      <FormHeader>
        {creating ? (
          <EntrySwitch value="income" />
        ) : (
          <Text accessibilityRole="header" style={styles.title}>
            {recurringId !== null ? 'Monthly income' : 'Edit income'}
          </Text>
        )}
      </FormHeader>

      <View style={styles.amount}>
        <Text accessibilityLiveRegion="polite" style={styles.amountValue}>
          +{formatCop(amountCop)}
        </Text>
        <Text style={styles.amountHint}>Colombian pesos</Text>
      </View>

      <FormGroup>
        <FormField label="From" divider>
          <FieldInput
            accessibilityLabel="From"
            autoCapitalize="words"
            onChangeText={setSource}
            placeholder="Who paid you"
            returnKeyType="done"
            value={source}
          />
        </FormField>
        {recurringId !== null ? (
          <DayStepper
            label="Pay day"
            value={`Day ${payDay}`}
            onPrevious={payDay > 1 ? () => setPayDay(payDay - 1) : undefined}
            onNext={payDay < 31 ? () => setPayDay(payDay + 1) : undefined}
          />
        ) : (
          <DayStepper
            label="Date"
            value={formatRelativeDay(receivedOn, today)}
            onPrevious={() => setReceivedOn(addDays(receivedOn, -1))}
            onNext={receivedOn < today ? () => setReceivedOn(addDays(receivedOn, 1)) : undefined}
          />
        )}
      </FormGroup>

      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}>
        {INCOME_KINDS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={kind === option.value}
            onPress={() => setKind(option.value)}
          />
        ))}
      </ScrollView>

      <Text style={styles.section}>Received in</Text>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}>
        {accounts.map((account) => (
          <Chip
            key={account.id}
            label={account.name}
            selected={accountId === account.id}
            onPress={() => setAccountId(account.id)}
          />
        ))}
        <Chip label="No account" selected={accountId === null} onPress={() => setAccountId(null)} />
      </ScrollView>

      {creating && (
        <FormGroup>
          <FormField label="Repeats every month">
            <Toggle label="Repeats every month" value={repeats} onChange={setRepeats} />
          </FormField>
          {repeats && (
            <Text style={styles.repeatHint}>
              Added by itself on day {Number(receivedOn.slice(8))} of each month, starting{' '}
              {formatDay(receivedOn)}.
            </Text>
          )}
        </FormGroup>
      )}

      <Keypad
        onDigits={(digits) => setAmountCop(appendDigits(amountCop, digits))}
        onDelete={() => setAmountCop(removeLastDigit(amountCop))}
      />

      <SaveButton
        disabled={!canSave}
        label={creating ? 'Save income' : 'Save changes'}
        onPress={save}
      />

      {!creating && (
        <DangerButton
          label={recurringId !== null ? 'Stop repeating' : 'Delete income'}
          onPress={remove}
        />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  amount: {
    alignItems: 'center',
    gap: 2,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.income,
    fontVariant: ['tabular-nums'],
  },
  amountHint: {
    fontSize: 13,
    color: colors.muted,
  },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  chipScroller: {
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: -20,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  repeatHint: {
    fontSize: 13,
    color: colors.muted,
    paddingBottom: 12,
  },
});
