import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { InstallmentPicker } from '@/components/installment-picker';
import { Keypad } from '@/components/keypad';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCardOptions, listDebitCards, type Card, type DebitCard } from '@/db/cards';
import {
  addExpense,
  getExpense,
  listCategories,
  updateExpense,
  type Category,
} from '@/db/expenses';
import { buildSchedule } from '@/lib/cards';
import { addDays, formatDay, formatRelativeDay, toDay } from '@/lib/dates';
import { appendDigits, formatCop, removeLastDigit } from '@/lib/money';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/payment';
import { syncReminders } from '@/lib/reminders';


export default function NewExpenseScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const today = toDay(new Date());
  const [amountCop, setAmountCop] = useState(0);
  const [merchant, setMerchant] = useState('');
  const [spentOn, setSpentOn] = useState(today);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>('cash');
  const [debitCards, setDebitCards] = useState<DebitCard[]>([]);
  const [cardId, setCardId] = useState<number | null>(null);
  const [debitCardId, setDebitCardId] = useState<number | null>(null);
  const [installments, setInstallments] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories(db).then((rows) => {
      setCategories(rows);
      if (id === null) setCategoryId(rows[0]?.id ?? null);
    });
    listCardOptions(db).then(setCards);
    listDebitCards(db).then(setDebitCards);
    if (id === null) return;

    getExpense(db, id).then((expense) => {
      if (!expense) return;
      setAmountCop(expense.amountCop);
      setMerchant(expense.merchant);
      setSpentOn(expense.spentOn);
      setCategoryId(expense.categoryId);
      setPaymentMethod(expense.paymentMethod);
      setCardId(expense.cardId);
      setDebitCardId(expense.debitCardId);
      setInstallments(expense.installments);
    });
  }, [db, id]);

  const canSave =
    amountCop > 0 &&
    merchant.trim().length > 0 &&
    categoryId !== null &&
    (paymentMethod !== 'card' || cardId !== null) &&
    !saving;

  const card = cards.find((option) => option.id === cardId);
  const schedule =
    card && amountCop >= installments
      ? buildSchedule(amountCop, installments, spentOn, card)
      : null;

  function choosePayment(method: PaymentMethod) {
    setPaymentMethod(method);
    setCardId(method === 'card' ? (cardId ?? cards[0]?.id ?? null) : null);
    setDebitCardId(method === 'debit' ? (debitCardId ?? debitCards[0]?.id ?? null) : null);
    if (method !== 'card') setInstallments(1);
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
        paymentMethod,
        cardId,
        debitCardId,
        installments: cardId === null ? 1 : installments,
      };
      if (id === null) {
        await addExpense(db, expense);
      } else {
        await updateExpense(db, id, expense);
      }
      await syncReminders(db);
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

      <Text style={styles.section}>Paid with</Text>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroller}>
        {PAYMENT_METHODS.map((method) => (
          <Chip
            key={method.value}
            label={method.label}
            selected={paymentMethod === method.value}
            onPress={() => choosePayment(method.value)}
          />
        ))}
      </ScrollView>

      {paymentMethod === 'card' && cards.length === 0 && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/card/form')}
          style={styles.addCard}>
          <Text style={styles.plan}>Add a credit card first</Text>
        </PressableScale>
      )}

      {paymentMethod === 'card' && cards.length > 1 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroller}>
          {cards.map((option) => (
            <Chip
              key={option.id}
              label={`${option.name} ${option.lastFour}`}
              selected={cardId === option.id}
              onPress={() => setCardId(option.id)}
            />
          ))}
        </ScrollView>
      )}

      {paymentMethod === 'debit' && debitCards.length > 1 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroller}>
          {debitCards.map((option) => (
            <Chip
              key={option.id}
              label={`${option.name} ${option.lastFour}`}
              selected={debitCardId === option.id}
              onPress={() => setDebitCardId(option.id)}
            />
          ))}
        </ScrollView>
      )}

      {cardId !== null && (
        <>
          <InstallmentPicker value={installments} onChange={setInstallments} />
          <Text style={styles.plan}>
            {schedule
              ? `${installments} × ${formatCop(schedule[schedule.length - 1].amountCop)} · first due ${formatDay(schedule[0].dueOn)}`
              : 'Enter the amount to see the plan'}
          </Text>
        </>
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
          {id === null ? 'Save expense' : 'Save changes'}
        </Text>
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
  section: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  addCard: {
    minHeight: 44,
    justifyContent: 'center',
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
