import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius } from '@/constants/theme';
import { listCards, listDebitCards, type CardWithSummary, type DebitCard } from '@/db/cards';
import { formatDay, toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';

export default function CardsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const today = toDay(new Date());
  const [cards, setCards] = useState<CardWithSummary[]>([]);
  const [debitCards, setDebitCards] = useState<DebitCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      listCards(db, today).then(setCards);
      listDebitCards(db).then(setDebitCards);
    }, [db, today]),
  );

  const closed = cards.filter((card) => card.statement.closed);
  const toPay = closed.reduce((sum, card) => sum + card.statement.balanceCop, 0);
  const minimum = closed.reduce((sum, card) => sum + (card.statement.minimumCop ?? 0), 0);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
      ]}
      style={styles.screen}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleButton} />
        <Text accessibilityRole="header" style={styles.title}>
          Cards
        </Text>
        <PressableScale
          accessibilityLabel="Add card"
          accessibilityRole="button"
          onPress={() => router.push('/card/form')}
          style={styles.titleButton}
        >
          <SymbolView name="plus" size={18} tintColor={colors.ink} />
        </PressableScale>
      </View>

      {cards.length === 0 && debitCards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyText}>
            Add your credit and debit cards to choose them when you pay.
          </Text>
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.push('/card/form')}
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonLabel}>Add card</Text>
          </PressableScale>
        </View>
      ) : (
        <>
          {cards.length > 0 && (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Total to pay this cycle</Text>
              <Text style={styles.total}>{formatCop(toPay)}</Text>
              {minimum > 0 && (
                <Text style={styles.summaryLabel}>
                  Minimum across cards{' '}
                  <Text style={styles.summaryStrong}>{formatCop(minimum)}</Text>
                </Text>
              )}
            </View>
          )}

          {cards.map((card, index) => (
            <CardTile key={card.id} card={card} dark={index === 0} />
          ))}

          {debitCards.length > 0 && (
            <>
              <Text style={styles.section}>Debit cards</Text>
              <View style={styles.debitList}>
                {debitCards.map((card, index) => (
                  <PressableScale
                    key={card.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/card/form?debitId=${card.id}`)}
                    style={[styles.debitRow, index < debitCards.length - 1 && styles.debitDivider]}
                  >
                    <Text numberOfLines={1} style={styles.debitName}>
                      {card.name}
                    </Text>
                    <Text style={styles.debitDigits}>•••• {card.lastFour}</Text>
                  </PressableScale>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function CardTile({ card, dark }: { card: CardWithSummary; dark: boolean }) {
  const ink = dark ? colors.surface : colors.ink;
  const label = dark ? '#B9CCC5' : colors.muted;

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/card/${card.id}`)}
      style={[styles.card, { backgroundColor: dark ? colors.pocket : colors.surface }]}
    >
      <View style={styles.cardRow}>
        <Text numberOfLines={1} style={[styles.cardName, { color: ink }]}>
          {card.name}
        </Text>
        <Text style={[styles.cardDigits, { color: ink }]}>•••• {card.lastFour}</Text>
      </View>
      <View style={[styles.cardRow, styles.cardBottom]}>
        <View style={styles.cardBalance}>
          <Text style={[styles.cardLabel, { color: label }]}>
            {card.statement.closed ? 'Statement balance' : 'Current cycle'}
          </Text>
          <Text style={[styles.cardAmount, { color: ink }]}>
            {formatCop(card.statement.balanceCop)}
          </Text>
        </View>
        <Text style={[styles.cardDue, { color: ink }]}>Due {formatDay(card.statement.dueOn)}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleButton: {
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
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 18,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  summaryStrong: {
    fontWeight: '600',
    color: colors.ink,
  },
  total: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  section: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  debitList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingHorizontal: 16,
  },
  debitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
  },
  debitDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  debitName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  debitDigits: {
    fontSize: 14,
    letterSpacing: 2,
    color: colors.muted,
  },
  card: {
    height: 168,
    borderRadius: radius.panel,
    paddingVertical: 18,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardBottom: {
    alignItems: 'flex-end',
  },
  cardName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  cardDigits: {
    fontSize: 14,
    letterSpacing: 2,
  },
  cardBalance: {
    gap: 2,
  },
  cardLabel: {
    fontSize: 12,
  },
  cardAmount: {
    fontSize: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cardDue: {
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 96,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    height: 56,
    marginTop: 10,
    borderRadius: radius.card,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});
