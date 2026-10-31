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
  accountId: number | null;
  accountName: string | null;
  interestRate: number;
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
  accountId: number | null;
  installments: number;
  interestRate: number;
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
         e.debit_card_id AS debitCardId, e.account_id AS accountId, a.name AS accountName,
         e.interest_rate AS interestRate, e.installments,
         COALESCE(k.name || ' ' || k.last_four, d.name || ' ' || d.last_four) AS cardLabel,
         k.cut_off_day AS cardCutOffDay, k.payment_day AS cardPaymentDay,
         c.name AS categoryName, c.icon AS categoryIcon,
         c.color AS categoryColor, c.tint AS categoryTint
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  LEFT JOIN cards k ON k.id = e.card_id
  LEFT JOIN debit_cards d ON d.id = e.debit_card_id
  LEFT JOIN accounts a ON a.id = e.account_id`;

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

export async function addExpense(db: SQLiteDatabase, expense: NewExpense): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO expenses
       (merchant, amount_cop, category_id, spent_on, payment_method, card_id, debit_card_id,
        account_id, installments, interest_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    expense.merchant.trim(),
    expense.amountCop,
    expense.categoryId,
    expense.spentOn,
    expense.paymentMethod,
    expense.cardId,
    expense.debitCardId,
    expense.accountId,
    expense.installments,
    expense.interestRate,
  );
  return result.lastInsertRowId;
}

export async function updateExpense(
  db: SQLiteDatabase,
  id: number,
  expense: NewExpense,
): Promise<void> {
  await db.runAsync(
    `UPDATE expenses
     SET merchant = ?, amount_cop = ?, category_id = ?, spent_on = ?,
         payment_method = ?, card_id = ?, debit_card_id = ?, account_id = ?,
         installments = ?, interest_rate = ?
     WHERE id = ?`,
    expense.merchant.trim(),
    expense.amountCop,
    expense.categoryId,
    expense.spentOn,
    expense.paymentMethod,
    expense.cardId,
    expense.debitCardId,
    expense.accountId,
    expense.installments,
    expense.interestRate,
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
    `SELECT c.id, c.name, c.icon, c.color, c.tint, IFNULL(SUM(e.amount_cop), 0) AS totalCop
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id AND substr(e.spent_on, 1, 7) = ?
     GROUP BY c.id
     ORDER BY totalCop DESC, c.sort_order`,
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

export function listAllExpenses(db: SQLiteDatabase): Promise<Expense[]> {
  return db.getAllAsync<Expense>(`${SELECT_EXPENSE} ORDER BY e.spent_on DESC, e.id DESC`);
}

export async function setExpenseCategory(
  db: SQLiteDatabase,
  id: number,
  categoryId: number,
): Promise<void> {
  await db.runAsync('UPDATE expenses SET category_id = ? WHERE id = ?', categoryId, id);
}

// A merchant keeps the category it had last time.
export async function guessCategoryId(
  db: SQLiteDatabase,
  merchant: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ categoryId: number }>(
    `SELECT category_id AS categoryId FROM expenses
     WHERE merchant = ? COLLATE NOCASE
     ORDER BY id DESC
     LIMIT 1`,
    merchant,
  );
  if (row) return row.categoryId;
  return (await listCategories(db))[0]?.id ?? null;
}

// The same link arriving twice within two minutes is one payment, not two.
export async function findRecentExpense(
  db: SQLiteDatabase,
  merchant: string,
  amountCop: number,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM expenses
     WHERE merchant = ? COLLATE NOCASE AND amount_cop = ?
       AND created_at >= datetime('now', '-2 minutes')
     ORDER BY id DESC
     LIMIT 1`,
    merchant,
    amountCop,
  );
  return row?.id ?? null;
}

export type CategoryInput = Omit<Category, 'id'>;

export function getCategory(db: SQLiteDatabase, id: number): Promise<Category | null> {
  return db.getFirstAsync<Category>(
    'SELECT id, name, icon, color, tint FROM categories WHERE id = ?',
    id,
  );
}

export async function addCategory(db: SQLiteDatabase, input: CategoryInput): Promise<void> {
  await db.runAsync(
    `INSERT INTO categories (name, icon, color, tint, sort_order)
     VALUES (?, ?, ?, ?, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM categories))`,
    input.name.trim(),
    input.icon,
    input.color,
    input.tint,
  );
}

export async function updateCategory(
  db: SQLiteDatabase,
  id: number,
  input: CategoryInput,
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ?, tint = ? WHERE id = ?',
    input.name.trim(),
    input.icon,
    input.color,
    input.tint,
    id,
  );
}

export async function countCategoryUses(db: SQLiteDatabase, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT (SELECT COUNT(*) FROM expenses WHERE category_id = ?) +
            (SELECT COUNT(*) FROM recurring WHERE category_id = ?) AS total`,
    id,
    id,
  );
  return row?.total ?? 0;
}

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}
