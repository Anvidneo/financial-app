import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  FieldInput,
  FormField,
  FormGroup,
  FormHeader,
  FormScreen,
  SaveButton,
} from '@/components/form';
import { Chip } from '@/components/chip';
import { LoadFailed } from '@/components/load-failed';
import { PaymentPicker, type Payment } from '@/components/payment-picker';
import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCategories, type Category } from '@/db/expenses';
import { addRecurring, getRecurring, updateRecurring } from '@/db/recurring';
import { toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { requestReminders, syncReminders } from '@/lib/reminders';
import { useLoad } from '@/lib/use-load';

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
const REMIND_OPTIONS = [1, 3, 5, 7];

export default function RecurringFormScreen() {
  const db = useSQLiteContext();
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

  const { failed, retry } = useLoad(
    useCallback(async () => {
      const rows = await listCategories(db);
      setCategories(rows);
      if (id === null) {
        setCategoryId(rows.find((row) => row.name === 'Subscriptions')?.id ?? rows[0]?.id ?? null);
        return;
      }
      const item = await getRecurring(db, id, today);
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
    }, [db, id, today]),
    { onFocus: false },
  );

  if (failed) return <LoadFailed onRetry={retry} />;
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
    <FormScreen>
      <FormHeader>{id === null ? 'New recurring' : 'Edit recurring'}</FormHeader>

      <FormGroup>
        <FormField label="Name" divider>
          <FieldInput
            accessibilityLabel="Name"
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Netflix, electricity"
            returnKeyType="done"
            value={name}
          />
        </FormField>
        <FormField label="Amount">
          <FieldInput
            accessibilityLabel="Amount"
            keyboardType="number-pad"
            onChangeText={(text) => setAmountCop(Number(text.replace(/\D/g, '').slice(0, 12)))}
            placeholder="$0"
            value={amountCop > 0 ? formatCop(amountCop) : ''}
          />
        </FormField>
      </FormGroup>

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

      <SaveButton disabled={!canSave} label="Save recurring" onPress={save} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
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
});
