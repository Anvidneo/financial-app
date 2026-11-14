import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import {
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
import { InstallmentPicker } from '@/components/installment-picker';
import { Keypad } from '@/components/keypad';
import { LoadFailed } from '@/components/load-failed';
import { PaymentPicker, type Payment } from '@/components/payment-picker';
import { colors } from '@/constants/theme';
import type { Card } from '@/db/cards';
import {
  addExpense,
  getExpense,
  listCategories,
  updateExpense,
  type Category,
} from '@/db/expenses';
import { buildSchedule, parseRate } from '@/lib/cards';
import { addDays, formatDay, formatRelativeDay, toDay } from '@/lib/dates';
import { appendDigits, formatCop, removeLastDigit } from '@/lib/money';
import type { PaymentMethod } from '@/lib/payment';
import { syncReminders } from '@/lib/reminders';
import { useLoad } from '@/lib/use-load';

export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{
    id?: string;
    merchant?: string;
    payment?: PaymentMethod;
  }>();
  const id = params.id ? Number(params.id) : null;
  const today = toDay(new Date());
  const [amountCop, setAmountCop] = useState(0);
  const [merchant, setMerchant] = useState(params.merchant ?? '');
  const [spentOn, setSpentOn] = useState(today);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [payment, setPayment] = useState<Payment>({
    paymentMethod: params.payment ?? 'cash',
    cardId: null,
    debitCardId: null,
    accountId: null,
  });
  const [installments, setInstallments] = useState(1);
  const [interestText, setInterestText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      const rows = await listCategories(db);
      setCategories(rows);
      if (id === null) {
        setCategoryId(rows[0]?.id ?? null);
        return;
      }
      const expense = await getExpense(db, id);
      if (!expense) return;
      setAmountCop(expense.amountCop);
      setMerchant(expense.merchant);
      setSpentOn(expense.spentOn);
      setCategoryId(expense.categoryId);
      setPayment({
        paymentMethod: expense.paymentMethod,
        cardId: expense.cardId,
        debitCardId: expense.debitCardId,
        accountId: expense.accountId,
      });
      setInstallments(expense.installments);
      if (expense.interestRate > 0) setInterestText(expense.interestRate.toString());
    }, [db, id]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  const canSave =
    amountCop > 0 &&
    merchant.trim().length > 0 &&
    categoryId !== null &&
    (payment.paymentMethod !== 'card' || payment.cardId !== null) &&
    !saving;

  const card = cards.find((option) => option.id === payment.cardId);
  const shownRate = interestText ?? (card?.monthlyRate ?? 0).toString();
  const interestRate = installments > 1 ? parseRate(shownRate) : 0;
  const schedule =
    card && amountCop >= installments
      ? buildSchedule(amountCop, installments, spentOn, card, interestRate)
      : null;

  function changePayment(next: Payment) {
    setPayment(next);
    if (next.paymentMethod !== 'card') setInstallments(1);
  }

  async function save() {
    if (!canSave || categoryId === null) return;
    setSaving(true);
    try {
      const expense = {
        merchant,
        amountCop,
        categoryId,
        spentOn,
        ...payment,
        installments: payment.cardId === null ? 1 : installments,
        interestRate: payment.cardId === null ? 0 : interestRate,
      };
      if (id === null) {
        await addExpense(db, expense);
      } else {
        await updateExpense(db, id, expense);
      }
      await syncReminders(db);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Expense not saved', 'Nothing changed. Try saving again.');
    }
  }

  return (
    <FormScreen>
      <FormHeader>
        {id === null && !params.merchant ? (
          <EntrySwitch value="expense" />
        ) : (
          <Text accessibilityRole="header" style={styles.title}>
            {id === null ? 'New expense' : 'Edit expense'}
          </Text>
        )}
      </FormHeader>

      <View style={styles.amount}>
        <Text accessibilityLiveRegion="polite" style={styles.amountValue}>
          {formatCop(amountCop)}
        </Text>
        <Text style={styles.amountHint}>Colombian pesos</Text>
      </View>

      <FormGroup>
        <FormField label="Merchant" divider>
          <FieldInput
            accessibilityLabel="Merchant"
            autoCapitalize="words"
            onChangeText={setMerchant}
            placeholder="Where you paid"
            returnKeyType="done"
            value={merchant}
          />
        </FormField>
        <DayStepper
          label="Date"
          value={formatRelativeDay(spentOn, today)}
          onPrevious={() => setSpentOn(addDays(spentOn, -1))}
          onNext={spentOn < today ? () => setSpentOn(addDays(spentOn, 1)) : undefined}
        />
      </FormGroup>

      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ScrollView>

      <PaymentPicker value={payment} onChange={changePayment} onCardsLoaded={setCards}>
        {payment.cardId !== null && (
          <>
            <InstallmentPicker value={installments} onChange={setInstallments} />
            {installments > 1 && (
              <FormGroup>
                <FormField label="Monthly interest %">
                  <FieldInput
                    accessibilityLabel="Monthly interest percent"
                    keyboardType="decimal-pad"
                    onChangeText={setInterestText}
                    placeholder="0"
                    value={shownRate === '0' ? '' : shownRate}
                  />
                </FormField>
              </FormGroup>
            )}
            <Text style={styles.plan}>
              {schedule
                ? `${installments} installments · first ${formatCop(schedule[0].amountCop)} due ${formatDay(schedule[0].dueOn)}`
                : 'Enter the amount to see the plan'}
            </Text>
          </>
        )}
      </PaymentPicker>

      <Animated.View layout={LinearTransition.duration(200)} style={styles.bottom}>
        <Keypad
          onDigits={(digits) => setAmountCop(appendDigits(amountCop, digits))}
          onDelete={() => setAmountCop(removeLastDigit(amountCop))}
        />

        <SaveButton
          disabled={!canSave}
          label={id === null ? 'Save expense' : 'Save changes'}
          onPress={save}
        />
      </Animated.View>
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
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  amountHint: {
    fontSize: 13,
    color: colors.muted,
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
  bottom: {
    gap: 12,
  },
  plan: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
