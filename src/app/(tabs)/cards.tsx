import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Strong, SummaryCard, TabTitle } from '@/components/tab-parts';
import { useTabRail } from '@/components/floating-tabs';
import { LoadFailed } from '@/components/load-failed';
import { PressableScale } from '@/components/pressable-scale';
import { FadeInScreen, ScreenSkeleton } from '@/components/skeleton';
import { colors, radius } from '@/constants/theme';
import { listCards, listDebitCards, type CardWithSummary, type DebitCard } from '@/db/cards';
import { formatDay, toDay } from '@/lib/dates';
import { formatCop } from '@/lib/money';
import { useLoad } from '@/lib/use-load';

export default function CardsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const rail = useTabRail();
  const today = toDay(new Date());
  const [cards, setCards] = useState<CardWithSummary[]>([]);
  const [debitCards, setDebitCards] = useState<DebitCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { failed, retry } = useLoad(
    useCallback(async () => {
      await Promise.all([listCards(db, today), listDebitCards(db)]).then(
        ([cardRows, debitRows]) => {
          setCards(cardRows);
          setDebitCards(debitRows);
          setLoaded(true);
        },
      );
    }, [db, today]),
  );

  if (failed) return <LoadFailed onRetry={retry} />;
  if (!loaded) return <ScreenSkeleton variant="list" />;

  const closed = cards.filter((card) => card.statement.closed);
  const toPay = closed.reduce((sum, card) => sum + card.statement.balanceCop, 0);
  const minimum = closed.reduce((sum, card) => sum + (card.statement.minimumCop ?? 0), 0);

  return (
    <FadeInScreen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: rail.contentBottom },
        ]}
        style={styles.screen}>
        <TabTitle
          title="Cards"
          add={{ label: 'Add card', onPress: () => router.push('/card/form') }}
        />

        {cards.length === 0 && debitCards.length === 0 ? (
          <EmptyState
            title="No cards yet"
            text="Add your credit and debit cards to choose them when you pay."
            action={{ label: 'Add card', onPress: () => router.push('/card/form') }}
          />
        ) : (
          <>
            {cards.length > 0 && (
              <SummaryCard label="Total to pay this cycle" amount={formatCop(toPay)}>
                {minimum > 0 ? (
                  <>
                    Minimum across cards <Strong>{formatCop(minimum)}</Strong>
                  </>
                ) : null}
              </SummaryCard>
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
                      style={[
                        styles.debitRow,
                        index < debitCards.length - 1 && styles.debitDivider,
                      ]}>
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
    </FadeInScreen>
  );
}

function CardTile({ card, dark }: { card: CardWithSummary; dark: boolean }) {
  const ink = dark ? colors.surface : colors.ink;
  const label = dark ? '#B9CCC5' : colors.muted;

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push(`/card/${card.id}`)}
      style={[styles.card, { backgroundColor: dark ? colors.pocket : colors.surface }]}>
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
});
