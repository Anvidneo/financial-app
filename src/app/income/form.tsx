import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { EntrySwitch } from '@/components/entry-switch';
import { Keypad } from '@/components/keypad';
import { PressableScale } from '@/components/pressable-scale';
import { Toggle } from '@/components/toggle';
import { colors, radius } from '@/constants/theme';
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

export default function IncomeFormScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    listAccounts(db).then((rows) => {
      setAccounts(rows);
      if (creating) setAccountId(rows[0]?.id ?? null);
    });
    if (id !== null) {
      getIncome(db, id).then((income) => {
        if (!income) return;
        setAmountCop(income.amountCop);
        setSource(income.source);
        setReceivedOn(income.receivedOn);
        setKind(income.kind);
        setAccountId(income.accountId);
      });
    }
    if (recurringId !== null) {
      getRecurringIncome(db, recurringId, today).then((income) => {
        if (!income) return;
        setAmountCop(income.amountCop);
        setSource(income.source);
        setPayDay(income.payDay);
        setKind(income.kind);
        setAccountId(income.accountId);
      });
    }
  }, [db, id, recurringId, creating, today]);

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
            onPress: async () => {
              await stopRecurringIncome(db, recurringId);
              router.back();
            },
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
        onPress: async () => {
          await deleteIncome(db, id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 12 }]}
      style={styles.screen}>
      <View style={styles.header}>
        <PressableScale
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.close}>
          <SymbolView name="xmark" size={16} tintColor={colors.ink} />
        </PressableScale>
        {creating ? (
          <EntrySwitch value="income" />
        ) : (
          <Text accessibilityRole="header" style={styles.title}>
            {recurringId !== null ? 'Monthly income' : 'Edit income'}
          </Text>
        )}
        <View style={styles.close} />
      </View>

      <View style={styles.amount}>
        <Text accessibilityLiveRegion="polite" style={styles.amountValue}>
          +{formatCop(amountCop)}
        </Text>
        <Text style={styles.amountHint}>Colombian pesos</Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.field, styles.fieldDivider]}>
          <Text style={styles.fieldLabel}>From</Text>
          <TextInput
            accessibilityLabel="From"
            autoCapitalize="words"
            onChangeText={setSource}
            placeholder="Who paid you"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={source}
          />
        </View>
        {recurringId !== null ? (
          <Stepper
            label="Pay day"
            value={`Day ${payDay}`}
            onPrevious={payDay > 1 ? () => setPayDay(payDay - 1) : undefined}
            onNext={payDay < 31 ? () => setPayDay(payDay + 1) : undefined}
          />
        ) : (
          <Stepper
            label="Date"
            value={formatRelativeDay(receivedOn, today)}
            onPrevious={() => setReceivedOn(addDays(receivedOn, -1))}
            onNext={receivedOn < today ? () => setReceivedOn(addDays(receivedOn, 1)) : undefined}
          />
        )}
      </View>

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
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Repeats every month</Text>
            <Toggle label="Repeats every month" value={repeats} onChange={setRepeats} />
          </View>
          {repeats && (
            <Text style={styles.repeatHint}>
              Added by itself on day {Number(receivedOn.slice(8))} of each month, starting{' '}
              {formatDay(receivedOn)}.
            </Text>
          )}
        </View>
      )}

      <Keypad
        onDigits={(digits) => setAmountCop(appendDigits(amountCop, digits))}
        onDelete={() => setAmountCop(removeLastDigit(amountCop))}
      />

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>
          {creating ? 'Save income' : 'Save changes'}
        </Text>
      </PressableScale>

      {!creating && (
        <PressableScale accessibilityRole="button" onPress={remove} style={styles.remove}>
          <Text style={styles.removeLabel}>
            {recurringId !== null ? 'Stop repeating' : 'Delete income'}
          </Text>
        </PressableScale>
      )}
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepper}>
        <StepButton icon="chevron.left" label={`Previous ${label}`} onPress={onPrevious} />
        <Text style={styles.stepValue}>{value}</Text>
        <StepButton icon="chevron.right" label={`Next ${label}`} onPress={onNext} />
      </View>
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron.left' | 'chevron.right';
  label: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={styles.stepButton}>
      <SymbolView name={icon} size={14} tintColor={onPress ? colors.muted : colors.control} />
    </PressableScale>
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
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -14,
  },
  stepValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minWidth: 76,
    textAlign: 'center',
  },
  stepButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  save: {
    height: 56,
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
  remove: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
