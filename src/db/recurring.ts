import type { SQLiteDatabase } from 'expo-sqlite';

import { chargesThrough, latestDay, nextCharge } from '@/lib/billing';
import { addDays } from '@/lib/dates';

type RecurringRow = {
  id: number;
  name: string;
  amountCop: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryTint: string;
  billingDay: number;
  remindDays: number;
  remindersOn: number;
  startsOn: string;
  lastPostedOn: string | null;
  lastPaidOn: string | null;
};

export type Recurring = Omit<RecurringRow, 'remindersOn'> & {
  remindersOn: boolean;
  nextChargeOn: string;
  after: string;
};

export type RecurringInput = {
  name: string;
  amountCop: number;
  categoryId: number;
  billingDay: number;
  remindDays: number;
};

export type RecurringCharge = {
  id: number;
  amountCop: number;
  spentOn: string;
};

const SELECT_RECURRING = `
  SELECT r.id, r.name, r.amount_cop AS amountCop, r.category_id AS categoryId,
         c.name AS categoryName, c.icon AS categoryIcon,
         c.color AS categoryColor, c.tint AS categoryTint,
         r.billing_day AS billingDay, r.remind_days AS remindDays,
         r.reminders_on AS remindersOn, r.starts_on AS startsOn,
         r.last_posted_on AS lastPostedOn,
         (SELECT MAX(e.spent_on) FROM expenses e WHERE e.recurring_id = r.id) AS lastPaidOn
  FROM recurring r
  JOIN categories c ON c.id = r.category_id`;

function toRecurring(row: RecurringRow, today: string): Recurring {
  const after = latestDay(addDays(today, -1), row.startsOn, row.lastPostedOn);
  return {
    ...row,
    remindersOn: row.remindersOn === 1,
    after,
    nextChargeOn: nextCharge(row.billingDay, after),
  };
}

export async function listRecurring(db: SQLiteDatabase, today: string): Promise<Recurring[]> {
  const rows = await db.getAllAsync<RecurringRow>(`${SELECT_RECURRING} WHERE r.active = 1`);
  return rows
    .map((row) => toRecurring(row, today))
    .sort((a, b) => a.nextChargeOn.localeCompare(b.nextChargeOn));
}

export async function getRecurring(
  db: SQLiteDatabase,
  id: number,
  today: string,
): Promise<Recurring | null> {
  const row = await db.getFirstAsync<RecurringRow>(`${SELECT_RECURRING} WHERE r.id = ?`, id);
  return row ? toRecurring(row, today) : null;
}

export async function addRecurring(
  db: SQLiteDatabase,
  input: RecurringInput,
  today: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO recurring (name, amount_cop, category_id, billing_day, remind_days, starts_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.name.trim(),
    input.amountCop,
    input.categoryId,
    input.billingDay,
    input.remindDays,
    today,
  );
}

export async function updateRecurring(
  db: SQLiteDatabase,
  id: number,
  input: RecurringInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE recurring
     SET name = ?, amount_cop = ?, category_id = ?, billing_day = ?, remind_days = ?
     WHERE id = ?`,
    input.name.trim(),
    input.amountCop,
    input.categoryId,
    input.billingDay,
    input.remindDays,
    id,
  );
}

export async function setRemindersOn(
  db: SQLiteDatabase,
  id: number,
  remindersOn: boolean,
): Promise<void> {
  await db.runAsync('UPDATE recurring SET reminders_on = ? WHERE id = ?', remindersOn ? 1 : 0, id);
}

export async function cancelRecurring(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE recurring SET active = 0 WHERE id = ?', id);
}

export function listCharges(db: SQLiteDatabase, id: number): Promise<RecurringCharge[]> {
  return db.getAllAsync<RecurringCharge>(
    `SELECT id, amount_cop AS amountCop, spent_on AS spentOn
     FROM expenses
     WHERE recurring_id = ?
     ORDER BY spent_on DESC
     LIMIT 12`,
    id,
  );
}

// Registers every charge whose day has passed. last_posted_on remembers the newest one, so a
// charge deleted from the history is not registered again. The unique index keeps a repeat harmless.
export async function postDueCharges(db: SQLiteDatabase, today: string): Promise<void> {
  const items = await db.getAllAsync<RecurringRow>(`${SELECT_RECURRING} WHERE r.active = 1`);

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const after = latestDay(item.startsOn, item.lastPostedOn);
      const charges = chargesThrough(item.billingDay, after, today);
      for (const day of charges) {
        await db.runAsync(
          `INSERT OR IGNORE INTO expenses (merchant, amount_cop, category_id, spent_on, recurring_id)
           VALUES (?, ?, ?, ?, ?)`,
          item.name,
          item.amountCop,
          item.categoryId,
          day,
          item.id,
        );
      }
      if (charges.length > 0) {
        await db.runAsync(
          'UPDATE recurring SET last_posted_on = ? WHERE id = ?',
          charges[charges.length - 1],
          item.id,
        );
      }
    }
  });
}
