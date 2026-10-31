import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { listCardOptions, listDebitCards } from '@/db/cards';
import { addExpense, findRecentExpense, guessCategoryId, type NewExpense } from '@/db/expenses';
import { toDay } from '@/lib/dates';
import { lastFourDigits, parseAmount, parseBankMessage } from '@/lib/incoming';
import { syncReminders } from '@/lib/reminders';

type Params = {
  amount?: string;
  merchant?: string;
  card?: string;
  text?: string;
};

// Opened by the Shortcuts automation: financeapp://add?amount=...&merchant=...&card=...
export default function AddFromLinkScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<Params>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function register() {
      const message = parseBankMessage(params.text);
      const amountCop = parseAmount(params.amount) || message.amountCop;
      const merchant = (params.merchant || message.merchant).trim();

      if (amountCop === 0 || merchant === '') {
        router.replace({
          pathname: '/new-expense',
          params: { merchant, payment: 'apple_pay' },
        });
        return;
      }

      const repeated = await findRecentExpense(db, merchant, amountCop);
      if (repeated !== null) {
        router.replace(`/quick/${repeated}`);
        return;
      }

      const digits = lastFourDigits(params.card ?? params.text);
      const credit = (await listCardOptions(db)).find((card) => card.lastFour === digits);
      const debit = (await listDebitCards(db)).find((card) => card.lastFour === digits);
      const categoryId = await guessCategoryId(db, merchant);
      if (categoryId === null) return;

      const expense: NewExpense = {
        merchant,
        amountCop,
        categoryId,
        spentOn: toDay(new Date()),
        paymentMethod: credit ? 'card' : debit ? 'debit' : params.text ? null : 'apple_pay',
        cardId: credit?.id ?? null,
        debitCardId: debit?.id ?? null,
        accountId: debit?.accountId ?? null,
        installments: 1,
        interestRate: 0,
      };
      const id = await addExpense(db, expense);
      await syncReminders(db);
      router.replace(`/quick/${id}`);
    }

    register();
  }, [db, params]);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
