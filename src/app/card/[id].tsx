import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { getCard, setStatementMinimum, type CardWithSummary } from '@/db/cards';
import { formatDay, toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';

export default function CardDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const today = toDay(new Date());
  const [card, setCard] = useState<CardWithSummary | null>(null);

  const load = useCallback(() => {
    getCard(db, id, today).then(setCard);
  }, [db, id, today]);

  useFocusEffect(load);

  if (!card) return <View style={styles.screen} />;

  const { statement } = card;
  const usedShare = card.limitCop > 0 ? Math.min(card.usedCop / card.limitCop, 1) : 0;

  function askMinimum() {
    Alert.prompt(
      'Minimum payment',
      'Enter the amount from your statement.',
      async (text) => {
        const minimumCop = Number(text.replace(/\D/g, ''));
        if (minimumCop <= 0) return;
        await setStatementMinimum(db, id, statement.cutOffOn, minimumCop);
        load();
      },
      'plain-text',
      statement.minimumCop?.toString() ?? '',
      'number-pad',
    );
  }

  return (
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
          {card.name} •••• {card.lastFour}
        </Text>
        <PressableScale
          accessibilityLabel="Edit card"
          accessibilityRole="button"
          onPress={() => router.push(`/card/form?id=${id}`)}
          style={styles.headerButton}>
          <SymbolView name="pencil" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      <View style={styles.balance}>
        <Text style={styles.label}>
          {statement.closed ? 'Statement balance' : 'Current cycle'}
        </Text>
        <Text style={styles.amount}>{formatCop(statement.balanceCop)}</Text>
        {statement.paidCop > 0 && (
          <Text style={styles.label}>
            {formatCop(statement.paidCop)} paid of {formatCop(statement.totalCop)}
          </Text>
        )}
        {statement.closed && (
          <PressableScale accessibilityRole="button" onPress={askMinimum} style={styles.minimum}>
            <Text style={styles.label}>
              Minimum payment{' '}
              <Text style={styles.strong}>
                {statement.minimumCop === null ? 'Add' : formatCop(statement.minimumCop)}
              </Text>
            </Text>
          </PressableScale>
        )}
      </View>

      <View style={styles.dates}>
        <View style={styles.date}>
          <Text style={styles.dateLabel}>Cut-off date</Text>
          <Text style={styles.dateValue}>{formatDay(statement.cutOffOn)}</Text>
        </View>
        <View style={styles.date}>
          <Text style={styles.dateLabel}>Payment due</Text>
          <Text style={[styles.dateValue, statement.closed && styles.due]}>
            {formatDay(statement.dueOn)}
          </Text>
        </View>
      </View>

      <View style={styles.credit}>
        <View style={styles.creditRow}>
          <Text style={styles.creditLabel}>Credit used</Text>
          <Text style={styles.creditValue}>
            {formatCop(card.usedCop)} of {formatCop(card.limitCop)}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${usedShare * 100}%` }]} />
        </View>
        <Text style={styles.creditLabel}>{formatCop(card.availableCop)} available</Text>
      </View>

      {statement.closed && statement.balanceCop > 0 && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push(`/card/pay?id=${id}`)}
          style={styles.paid}>
          <Text style={styles.paidLabel}>Record a payment</Text>
        </PressableScale>
      )}

      {statement.items.length > 0 ? (
        <>
          <Text style={styles.section}>Movements</Text>
          <View style={styles.list}>
            {statement.items.map((item, index) => (
              <PressableScale
                key={`${item.purchaseId}-${item.number}`}
                accessibilityRole="button"
                onPress={() => router.push(`/expense/${item.purchaseId}`)}
                style={[styles.row, index < statement.items.length - 1 && styles.divider]}>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.rowName}>
                    {item.merchant}
                  </Text>
                  <Text style={styles.rowDetail}>
                    {item.count === 1
                      ? '1 installment'
                      : `Installment ${item.number} of ${item.count}`}{' '}
                    · {formatDay(item.spentOn)}
                  </Text>
                </View>
                <Text style={styles.rowName}>{formatCop(item.amountCop)}</Text>
              </PressableScale>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.nothing}>No movements in this cycle.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
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
  balance: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
  },
  strong: {
    fontWeight: '600',
    color: colors.ink,
  },
  amount: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  minimum: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dates: {
    flexDirection: 'row',
    gap: 12,
  },
  date: {
    flex: 1,
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  due: {
    color: colors.danger,
  },
  credit: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  creditLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  creditValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.control,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.credit,
  },
  paid: {
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  list: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rowDetail: {
    fontSize: 12,
    color: colors.muted,
  },
  nothing: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
