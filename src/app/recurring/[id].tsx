import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryTile } from '@/components/category-tile';
import { PressableScale } from '@/components/pressable-scale';
import { FadeInScreen, ScreenSkeleton } from '@/components/skeleton';
import { ChargeStatus } from '@/components/status-label';
import { Toggle } from '@/components/toggle';
import { colors, radius } from '@/constants/theme';
import {
  cancelRecurring,
  getRecurring,
  listCharges,
  setRemindersOn,
  type Recurring,
  type RecurringCharge,
} from '@/db/recurring';
import { formatDay, toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { paymentLabel } from '@/lib/payment';
import { syncReminders } from '@/lib/reminders';

export default function RecurringDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const today = toDay(new Date());
  const [item, setItem] = useState<Recurring | null>(null);
  const [charges, setCharges] = useState<RecurringCharge[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecurring(db, id, today).then(setItem);
      listCharges(db, id).then(setCharges);
    }, [db, id, today]),
  );

  if (!item) return <ScreenSkeleton variant="detail" />;

  async function toggleReminders(value: boolean) {
    await setRemindersOn(db, id, value);
    setItem((current) => (current ? { ...current, remindersOn: value } : current));
    await syncReminders(db);
  }

  function confirmCancel() {
    Alert.alert(
      `Cancel ${item?.name}?`,
      'It stops appearing here and gets no more reminders. Past charges stay in Expenses.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Mark as cancelled',
          style: 'destructive',
          onPress: async () => {
            await cancelRecurring(db, id);
            await syncReminders(db);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <FadeInScreen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
        style={styles.screen}>
        <View style={styles.header}>
          <PressableScale
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.headerButton}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
          </PressableScale>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {item.name}
          </Text>
          <PressableScale
            accessibilityLabel="Edit recurring"
            accessibilityRole="button"
            onPress={() => router.push(`/recurring/form?id=${id}`)}
            style={styles.headerButton}>
            <SymbolView name="pencil" size={18} tintColor={colors.ink} />
          </PressableScale>
        </View>

        <View style={styles.next}>
          <Text style={styles.label}>Next charge {formatDay(item.nextChargeOn)}</Text>
          <Text style={styles.amount}>{formatCop(item.amountCop)}</Text>
          <ChargeStatus nextChargeOn={item.nextChargeOn} lastPaidOn={null} today={today} />
        </View>

        <View style={styles.card}>
          <Detail label="Category" value={item.categoryName} />
          <Detail label="Billing day" value={`Day ${item.billingDay}`} />
          <Detail
            label="Paid with"
            value={paymentLabel(item.paymentMethod, item.cardLabel) ?? 'Not set'}
          />
          {item.accountName && <Detail label="From account" value={item.accountName} />}
          <View style={styles.detail}>
            <Text style={styles.label}>
              Remind {item.remindDays} {item.remindDays === 1 ? 'day' : 'days'} before
            </Text>
            <Toggle label="Reminders" value={item.remindersOn} onChange={toggleReminders} />
          </View>
        </View>

        <Text style={styles.section}>History</Text>
        {charges.length === 0 ? (
          <Text style={styles.label}>Charges appear here after each billing day.</Text>
        ) : (
          <View style={styles.card}>
            {charges.map((charge, index) => (
              <View
                key={charge.id}
                style={[styles.charge, index < charges.length - 1 && styles.divider]}>
                <CategoryTile
                  icon={item.categoryIcon}
                  color={item.categoryColor}
                  tint={item.categoryTint}
                />
                <Text style={styles.chargeDay}>{formatDay(charge.spentOn)}</Text>
                <Text style={styles.chargeAmount}>{formatCop(charge.amountCop)}</Text>
              </View>
            ))}
          </View>
        )}

        <PressableScale accessibilityRole="button" onPress={confirmCancel} style={styles.cancel}>
          <Text style={styles.cancelLabel}>Mark as cancelled</Text>
        </PressableScale>
      </ScrollView>
    </FadeInScreen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.detail, styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  next: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  amount: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: {
    fontSize: 14,
    color: colors.muted,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  charge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  chargeDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  chargeAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  cancel: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
