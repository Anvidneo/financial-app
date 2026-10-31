import type { SQLiteDatabase } from 'expo-sqlite';

import { summarizeCard, type CardPurchase, type CardSummary, type StatementRecord } from '@/lib/cards';

export type Card = {
  id: number;
  name: string;
  lastFour: string;
  limitCop: number;
  cutOffDay: number;
  paymentDay: number;
};

export type CardInput = Omit<Card, 'id'>;

export type CardWithSummary = Card & CardSummary & { purchaseCount: number };

const SELECT_CARD = `
  SELECT id, name, last_four AS lastFour, limit_cop AS limitCop,
         cut_off_day AS cutOffDay, payment_day AS paymentDay
  FROM cards`;

export function listCardOptions(db: SQLiteDatabase): Promise<Card[]> {
  return db.getAllAsync<Card>(`${SELECT_CARD} ORDER BY id`);
}

async function withSummary(db: SQLiteDatabase, card: Card, today: string): Promise<CardWithSummary> {
  const purchases = await db.getAllAsync<CardPurchase>(
    `SELECT id, merchant, amount_cop AS amountCop, installments, spent_on AS spentOn
     FROM expenses
     WHERE card_id = ?`,
    card.id,
  );
  const records = await db.getAllAsync<StatementRecord>(
    `SELECT cut_off_on AS cutOffOn, minimum_cop AS minimumCop, paid_on AS paidOn
     FROM card_statements
     WHERE card_id = ?`,
    card.id,
  );

  return {
    ...card,
    ...summarizeCard(card, purchases, records, today),
    purchaseCount: purchases.length,
  };
}

export async function listCards(db: SQLiteDatabase, today: string): Promise<CardWithSummary[]> {
  const cards = await listCardOptions(db);
  return Promise.all(cards.map((card) => withSummary(db, card, today)));
}

export async function getCard(
  db: SQLiteDatabase,
  id: number,
  today: string,
): Promise<CardWithSummary | null> {
  const card = await db.getFirstAsync<Card>(`${SELECT_CARD} WHERE id = ?`, id);
  return card ? withSummary(db, card, today) : null;
}

export async function addCard(db: SQLiteDatabase, input: CardInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO cards (name, last_four, limit_cop, cut_off_day, payment_day)
     VALUES (?, ?, ?, ?, ?)`,
    input.name.trim(),
    input.lastFour,
    input.limitCop,
    input.cutOffDay,
    input.paymentDay,
  );
}

export async function updateCard(db: SQLiteDatabase, id: number, input: CardInput): Promise<void> {
  await db.runAsync(
    `UPDATE cards
     SET name = ?, last_four = ?, limit_cop = ?, cut_off_day = ?, payment_day = ?
     WHERE id = ?`,
    input.name.trim(),
    input.lastFour,
    input.limitCop,
    input.cutOffDay,
    input.paymentDay,
    id,
  );
}

export async function deleteCard(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM cards WHERE id = ?', id);
}

export async function setStatementMinimum(
  db: SQLiteDatabase,
  cardId: number,
  cutOffOn: string,
  minimumCop: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO card_statements (card_id, cut_off_on, minimum_cop) VALUES (?, ?, ?)
     ON CONFLICT (card_id, cut_off_on) DO UPDATE SET minimum_cop = excluded.minimum_cop`,
    cardId,
    cutOffOn,
    minimumCop,
  );
}

export async function markStatementPaid(
  db: SQLiteDatabase,
  cardId: number,
  cutOffOn: string,
  today: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO card_statements (card_id, cut_off_on, paid_on) VALUES (?, ?, ?)
     ON CONFLICT (card_id, cut_off_on) DO UPDATE SET paid_on = excluded.paid_on`,
    cardId,
    cutOffOn,
    today,
  );
}

export type DebitCard = {
  id: number;
  name: string;
  lastFour: string;
  purchaseCount: number;
};

const SELECT_DEBIT_CARD = `
  SELECT d.id, d.name, d.last_four AS lastFour,
         (SELECT COUNT(*) FROM expenses e WHERE e.debit_card_id = d.id) AS purchaseCount
  FROM debit_cards d`;

export function listDebitCards(db: SQLiteDatabase): Promise<DebitCard[]> {
  return db.getAllAsync<DebitCard>(`${SELECT_DEBIT_CARD} ORDER BY d.id`);
}

export function getDebitCard(db: SQLiteDatabase, id: number): Promise<DebitCard | null> {
  return db.getFirstAsync<DebitCard>(`${SELECT_DEBIT_CARD} WHERE d.id = ?`, id);
}

export async function addDebitCard(
  db: SQLiteDatabase,
  name: string,
  lastFour: string,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO debit_cards (name, last_four) VALUES (?, ?)',
    name.trim(),
    lastFour,
  );
}

export async function updateDebitCard(
  db: SQLiteDatabase,
  id: number,
  name: string,
  lastFour: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE debit_cards SET name = ?, last_four = ? WHERE id = ?',
    name.trim(),
    lastFour,
    id,
  );
}

export async function deleteDebitCard(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM debit_cards WHERE id = ?', id);
}
