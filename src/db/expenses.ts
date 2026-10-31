import type { SQLiteDatabase } from 'expo-sqlite';

import type { PaymentMethod } from '@/lib/payment';

export type Category = {
  id: number;
  name: string;
  icon: string;
  color: string;
  tint: string;
};

export type Expense = {
  id: number;
  merchant: string;
  amountCop: number;
  spentOn: string;
  recurring: boolean;
  categoryId: number;
  paymentMethod: PaymentMethod | null;
  cardId: number | null;
  debitCardId: number | null;
  cardLabel: string | null;
  installments: number;
  cardCutOffDay: number | null;
  cardPaymentDay: number | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryTint: string;
};

export type NewExpense = {
  merchant: string;
  amountCop: number;
  categoryId: number;
  spentOn: string;
  paymentMethod: PaymentMethod | null;
  cardId: number | null;
  debitCardId: number | null;
  installments: number;
};

export function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT id, name, icon, color, tint FROM categories ORDER BY sort_order',
  );
}

const SELECT_EXPENSE = `
  SELECT e.id, e.merchant, e.amount_cop AS amountCop, e.spent_on AS spentOn,
         e.recurring_id IS NOT NULL AS recurring, e.category_id AS categoryId,
         e.payment_method AS paymentMethod, e.card_id AS cardId,
         e.debit_card_id AS debitCardId, e.installments,
         COALESCE(k.name || ' ' || k.last_four, d.name || ' ' || d.last_four) AS cardLabel,
         k.cut_off_day AS cardCutOffDay, k.payment_day AS cardPaymentDay,
         c.name AS categoryName, c.icon AS categoryIcon,
         c.color AS categoryColor, c.tint AS categoryTint
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  LEFT JOIN cards k ON k.id = e.card_id
  LEFT JOIN debit_cards d ON d.id = e.debit_card_id`;

export function listExpenses(
  db: SQLiteDatabase,
  month: string,
  categoryId: number | null,
): Promise<Expense[]> {
  return db.getAllAsync<Expense>(
    `${SELECT_EXPENSE}
     WHERE substr(e.spent_on, 1, 7) = ?
       AND (? IS NULL OR e.category_id = ?)
     ORDER BY e.spent_on DESC, e.id DESC`,
    month,
    categoryId,
    categoryId,
  );
}

export function getExpense(db: SQLiteDatabase, id: number): Promise<Expense | null> {
  return db.getFirstAsync<Expense>(`${SELECT_EXPENSE} WHERE e.id = ?`, id);
}

export async function addExpense(db: SQLiteDatabase, expense: NewExpense): Promise<void> {
  await db.runAsync(
    `INSERT INTO expenses
       (merchant, amount_cop, category_id, spent_on, payment_method, card_id, debit_card_id,
        installments)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    expense.merchant.trim(),
    expense.amountCop,
    expense.categoryId,
    expense.spentOn,
    expense.paymentMethod,
    expense.cardId,
    expense.debitCardId,
    expense.installments,
  );
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: number,
  expense: NewExpense,
): Promise<void> {
  await db.runAsync(
    `UPDATE expenses
     SET merchant = ?, amount_cop = ?, category_id = ?, spent_on = ?,
         payment_method = ?, card_id = ?, debit_card_id = ?, installments = ?
     WHERE id = ?`,
    expense.merchant.trim(),
    expense.amountCop,
    expense.categoryId,
    expense.spentOn,
    expense.paymentMethod,
    expense.cardId,
    expense.debitCardId,
    expense.installments,
    id,
  );
}

export async function deleteExpense(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

export type CategoryTotal = Category & { totalCop: number };

export async function listCategoryTotals(
  db: SQLiteDatabase,
  month: string,
): Promise<CategoryTotal[]> {
  return db.getAllAsync<CategoryTotal>(
    `SELECT c.id, c.name, c.icon, c.color, c.tint, SUM(e.amount_cop) AS totalCop
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE substr(e.spent_on, 1, 7) = ?
     GROUP BY c.id
     ORDER BY totalCop DESC`,
    month,
  );
}

export async function listMonthTotals(
  db: SQLiteDatabase,
  months: string[],
  categoryId: number | null,
): Promise<number[]> {
  const rows = await db.getAllAsync<{ month: string; totalCop: number }>(
    `SELECT substr(spent_on, 1, 7) AS month, SUM(amount_cop) AS totalCop
     FROM expenses
     WHERE substr(spent_on, 1, 7) BETWEEN ? AND ?
       AND (? IS NULL OR category_id = ?)
     GROUP BY month`,
    months[0],
    months[months.length - 1],
    categoryId,
    categoryId,
  );
  return months.map((month) => rows.find((row) => row.month === month)?.totalCop ?? 0);
}
