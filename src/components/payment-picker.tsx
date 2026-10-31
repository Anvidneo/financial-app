import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Chip } from '@/components/chip';
import { PressableScale } from '@/components/pressable-scale';
import { colors } from '@/constants/theme';
import { listAccounts, type Account } from '@/db/accounts';
import { listCardOptions, listDebitCards, type Card, type DebitCard } from '@/db/cards';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/payment';

export type Payment = {
  paymentMethod: PaymentMethod | null;
  cardId: number | null;
  debitCardId: number | null;
  accountId: number | null;
};

type Props = {
  value: Payment;
  optional?: boolean;
  onChange: (value: Payment) => void;
  onCardsLoaded?: (cards: Card[]) => void;
  children?: ReactNode;
};

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      style={styles.scroller}>
      {children}
    </ScrollView>
  );
}

export function PaymentPicker({
  value,
  optional = false,
  onChange,
  onCardsLoaded,
  children,
}: Props) {
  const db = useSQLiteContext();
  const [cards, setCards] = useState<Card[]>([]);
  const [debitCards, setDebitCards] = useState<DebitCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    listCardOptions(db).then((rows) => {
      setCards(rows);
      onCardsLoaded?.(rows);
    });
    listDebitCards(db).then(setDebitCards);
    listAccounts(db).then(setAccounts);
    // onCardsLoaded only reports the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  function chooseMethod(method: PaymentMethod) {
    if (optional && method === value.paymentMethod) {
      onChange({ paymentMethod: null, cardId: null, debitCardId: null, accountId: null });
      return;
    }
    const debit =
      method === 'debit'
        ? (debitCards.find((card) => card.id === value.debitCardId) ?? debitCards[0])
        : undefined;
    onChange({
      paymentMethod: method,
      cardId: method === 'card' ? (value.cardId ?? cards[0]?.id ?? null) : null,
      debitCardId: debit?.id ?? null,
      accountId: method === 'card' ? null : (debit?.accountId ?? value.accountId),
    });
  }

  function chooseDebit(card: DebitCard) {
    onChange({ ...value, debitCardId: card.id, accountId: card.accountId ?? value.accountId });
  }

  const method = value.paymentMethod;

  return (
    <>
      <Text style={styles.section}>Paid with</Text>
      <ChipRow>
        {PAYMENT_METHODS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={method === option.value}
            onPress={() => chooseMethod(option.value)}
          />
        ))}
      </ChipRow>

      {method === 'card' && cards.length === 0 && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/card/form')}
          style={styles.addCard}>
          <Text style={styles.addCardLabel}>Add a credit card first</Text>
        </PressableScale>
      )}

      {method === 'card' && cards.length > 1 && (
        <ChipRow>
          {cards.map((card) => (
            <Chip
              key={card.id}
              label={`${card.name} ${card.lastFour}`}
              selected={value.cardId === card.id}
              onPress={() => onChange({ ...value, cardId: card.id })}
            />
          ))}
        </ChipRow>
      )}

      {method === 'debit' && debitCards.length > 1 && (
        <ChipRow>
          {debitCards.map((card) => (
            <Chip
              key={card.id}
              label={`${card.name} ${card.lastFour}`}
              selected={value.debitCardId === card.id}
              onPress={() => chooseDebit(card)}
            />
          ))}
        </ChipRow>
      )}

      {method !== null && method !== 'card' && accounts.length > 0 && (
        <ChipRow>
          <Chip
            label="No account"
            selected={value.accountId === null}
            onPress={() => onChange({ ...value, accountId: null })}
          />
          {accounts.map((account) => (
            <Chip
              key={account.id}
              label={account.name}
              selected={value.accountId === account.id}
              onPress={() => onChange({ ...value, accountId: account.id })}
            />
          ))}
        </ChipRow>
      )}

      {children}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  scroller: {
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: -20,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  addCard: {
    minHeight: 44,
    justifyContent: 'center',
  },
  addCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
});
