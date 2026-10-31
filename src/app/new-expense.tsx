import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { InstallmentPicker } from '@/components/installment-picker';
import { Keypad } from '@/components/keypad';
import { PaymentPicker, type Payment } from '@/components/payment-picker';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
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

export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    listCategories(db).then((rows) => {
      setCategories(rows);
      if (id === null) setCategoryId(rows[0]?.id ?? null);
    });
    if (id === null) return;

    getExpense(db, id).then((expense) => {
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
    });
  }, [db, id]);

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
        <Text accessibilityRole="header" style={styles.title}>
          {id === null ? 'New expense' : 'Edit expense'}
        </Text>
        <View style={styles.close} />
      </View>

      <View style={styles.amount}>
        <Text accessibilityLiveRegion="polite" style={styles.amountValue}>
          {formatCop(amountCop)}
        </Text>
        <Text style={styles.amountHint}>Colombian pesos</Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.field, styles.fieldDivider]}>
          <Text style={styles.fieldLabel}>Merchant</Text>
          <TextInput
            accessibilityLabel="Merchant"
            autoCapitalize="words"
            onChangeText={setMerchant}
            placeholder="Where you paid"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={merchant}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date</Text>
          <View style={styles.dateControls}>
            <PressableScale
              accessibilityLabel="Previous day"
              accessibilityRole="button"
              onPress={() => setSpentOn(addDays(spentOn, -1))}
              style={styles.dayButton}>
              <SymbolView name="chevron.left" size={14} tintColor={colors.muted} />
            </PressableScale>
            <Text style={styles.dateValue}>{formatRelativeDay(spentOn, today)}</Text>
            <PressableScale
              accessibilityLabel="Next day"
              accessibilityRole="button"
              accessibilityState={{ disabled: spentOn === today }}
              disabled={spentOn === today}
              onPress={() => setSpentOn(addDays(spentOn, 1))}
              style={styles.dayButton}>
              <SymbolView
                name="chevron.right"
                size={14}
                tintColor={spentOn === today ? colors.control : colors.muted}
              />
            </PressableScale>
          </View>
        </View>
      </View>

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
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Monthly interest %</Text>
                  <TextInput
                    accessibilityLabel="Monthly interest percent"
                    keyboardType="decimal-pad"
                    onChangeText={setInterestText}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={shownRate === '0' ? '' : shownRate}
                  />
                </View>
              </View>
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

        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={save}
          style={[styles.save, !canSave && styles.saveDisabled]}>
          <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>
            {id === null ? 'Save expense' : 'Save changes'}
          </Text>
        </PressableScale>
      </Animated.View>
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
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -14,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    minWidth: 76,
    textAlign: 'center',
  },
  dayButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
});
