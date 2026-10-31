import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { PaymentPicker, type Payment } from '@/components/payment-picker';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCategories, type Category } from '@/db/expenses';
import { addRecurring, getRecurring, updateRecurring } from '@/db/recurring';
import { toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { requestReminders, syncReminders } from '@/lib/reminders';

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const REMIND_OPTIONS = [1, 3, 5, 7];

export default function RecurringFormScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const today = toDay(new Date());
  const [name, setName] = useState('');
  const [amountCop, setAmountCop] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [billingDay, setBillingDay] = useState<number | null>(null);
  const [remindDays, setRemindDays] = useState(3);
  const [payment, setPayment] = useState<Payment>({
    paymentMethod: null,
    cardId: null,
    debitCardId: null,
    accountId: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories(db).then((rows) => {
      setCategories(rows);
      if (id === null) {
        setCategoryId(rows.find((row) => row.name === 'Subscriptions')?.id ?? rows[0]?.id ?? null);
      }
    });
    if (id === null) return;

    getRecurring(db, id, today).then((item) => {
      if (!item) return;
      setName(item.name);
      setAmountCop(item.amountCop);
      setCategoryId(item.categoryId);
      setBillingDay(item.billingDay);
      setRemindDays(item.remindDays);
      setPayment({
        paymentMethod: item.paymentMethod,
        cardId: item.cardId,
        debitCardId: item.debitCardId,
        accountId: item.accountId,
      });
    });
  }, [db, id, today]);

  const canSave =
    name.trim().length > 0 &&
    amountCop > 0 &&
    categoryId !== null &&
    billingDay !== null &&
    !saving;

  async function save() {
    if (!canSave || categoryId === null || billingDay === null) return;
    setSaving(true);
    const input = { name, amountCop, categoryId, billingDay, remindDays, ...payment };
    try {
      if (id === null) {
        await addRecurring(db, input, today);
        await requestReminders();
      } else {
        await updateRecurring(db, id, input);
      }
      await syncReminders(db);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Recurring charge not saved', 'Nothing changed. Try saving again.');
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
          {id === null ? 'New recurring' : 'Edit recurring'}
        </Text>
        <View style={styles.close} />
      </View>

      <View style={styles.form}>
        <View style={[styles.field, styles.fieldDivider]}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            accessibilityLabel="Name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Netflix, electricity"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={styles.input}
            value={name}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Amount</Text>
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

      <Text style={styles.section}>Category</Text>
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

      <PaymentPicker optional value={payment} onChange={setPayment} />

      <Text style={styles.section}>Billing day</Text>
      <View style={styles.days}>
        {DAYS.map((day) => (
          <PressableScale
            key={day}
            accessibilityLabel={`Day ${day}`}
            accessibilityRole="button"
            accessibilityState={{ selected: billingDay === day }}
            onPress={() => setBillingDay(day)}
            style={[styles.day, billingDay === day && styles.daySelected]}>
            <Text style={[styles.dayLabel, billingDay === day && styles.dayLabelSelected]}>
              {day}
            </Text>
          </PressableScale>
        ))}
      </View>
      <Text style={styles.hint}>Days 29 to 31 fall on the last day of shorter months.</Text>

      <Text style={styles.section}>Remind me</Text>
      <View style={styles.remind}>
        {REMIND_OPTIONS.map((days) => (
          <Chip
            key={days}
            label={days === 1 ? '1 day' : `${days} days`}
            selected={remindDays === days}
            onPress={() => setRemindDays(days)}
          />
        ))}
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={save}
        style={[styles.save, !canSave && styles.saveDisabled]}>
        <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save recurring</Text>
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
    gap: 10,
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
  section: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  chipScroller: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 10,
  },
  day: {
    width: '14.28%',
    height: 44,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: colors.ink,
  },
  dayLabel: {
    fontSize: 14,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  dayLabelSelected: {
    fontWeight: '600',
    color: colors.surface,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
  },
  remind: {
    flexDirection: 'row',
    gap: 8,
  },
  save: {
    height: 56,
    marginTop: 10,
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
