import type { SQLiteDatabase } from 'expo-sqlite';

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
};

export function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT id, name, icon, color, tint FROM categories ORDER BY sort_order',
  );
}

export function listExpenses(
  db: SQLiteDatabase,
  month: string,
  categoryId: number | null,
): Promise<Expense[]> {
  return db.getAllAsync<Expense>(
    `SELECT e.id, e.merchant, e.amount_cop AS amountCop, e.spent_on AS spentOn,
            e.recurring_id IS NOT NULL AS recurring,
            c.name AS categoryName, c.icon AS categoryIcon,
            c.color AS categoryColor, c.tint AS categoryTint
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     WHERE substr(e.spent_on, 1, 7) = ?
       AND (? IS NULL OR e.category_id = ?)
     ORDER BY e.spent_on DESC, e.id DESC`,
    month,
    categoryId,
    categoryId,
  );
}

export async function addExpense(db: SQLiteDatabase, expense: NewExpense): Promise<void> {
  await db.runAsync(
    'INSERT INTO expenses (merchant, amount_cop, category_id, spent_on) VALUES (?, ?, ?, ?)',
    expense.merchant.trim(),
    expense.amountCop,
    expense.categoryId,
    expense.spentOn,
  );
}
