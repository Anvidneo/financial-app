import type { SQLiteDatabase } from 'expo-sqlite';

import { chargesThrough, latestDay, nextCharge } from '@/lib/billing';
import { addDays } from '@/lib/dates';
import type { IncomeKind } from '@/lib/income';

export type Income = {
  id: number;
  source: string;
  amountCop: number;
  kind: IncomeKind;
  receivedOn: string;
  accountId: number | null;
  accountName: string | null;
  recurringIncomeId: number | null;
};

export type IncomeInput = {
  source: string;
  amountCop: number;
  kind: IncomeKind;
  receivedOn: string;
  accountId: number | null;
};

export type RecurringIncome = {
  id: number;
  source: string;
  amountCop: number;
  kind: IncomeKind;
  payDay: number;
  accountId: number | null;
  accountName: string | null;
  startsOn: string;
  lastPostedOn: string | null;
  nextPayOn: string;
};

export type RecurringIncomeInput = Omit<IncomeInput, 'receivedOn'> & {
  payDay: number;
};

const SELECT_INCOME = `
  SELECT i.id, i.source, i.amount_cop AS amountCop, i.kind, i.received_on AS receivedOn,
         i.account_id AS accountId, a.name AS accountName,
         i.recurring_income_id AS recurringIncomeId
  FROM incomes i
  LEFT JOIN accounts a ON a.id = i.account_id`;

export function listIncomes(db: SQLiteDatabase, month: string): Promise<Income[]> {
  return db.getAllAsync<Income>(
    `${SELECT_INCOME}
     WHERE substr(i.received_on, 1, 7) = ?
     ORDER BY i.received_on DESC, i.id DESC`,
    month,
  );
}

export function listAllIncomes(db: SQLiteDatabase): Promise<Income[]> {
  return db.getAllAsync<Income>(`${SELECT_INCOME} ORDER BY i.received_on DESC, i.id DESC`);
}

export function getIncome(db: SQLiteDatabase, id: number): Promise<Income | null> {
  return db.getFirstAsync<Income>(`${SELECT_INCOME} WHERE i.id = ?`, id);
}

export async function monthIncomeTotal(db: SQLiteDatabase, month: string): Promise<number> {
  const row = await db.getFirstAsync<{ totalCop: number | null }>(
    'SELECT SUM(amount_cop) AS totalCop FROM incomes WHERE substr(received_on, 1, 7) = ?',
    month,
  );
  return row?.totalCop ?? 0;
}

export async function addIncome(db: SQLiteDatabase, income: IncomeInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO incomes (source, amount_cop, kind, received_on, account_id)
     VALUES (?, ?, ?, ?, ?)`,
    income.source.trim(),
    income.amountCop,
    income.kind,
    income.receivedOn,
    income.accountId,
  );
  return result.lastInsertRowId;
}

export async function updateIncome(
  db: SQLiteDatabase,
  id: number,
  income: IncomeInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE incomes SET source = ?, amount_cop = ?, kind = ?, received_on = ?, account_id = ?
     WHERE id = ?`,
    income.source.trim(),
    income.amountCop,
    income.kind,
    income.receivedOn,
    income.accountId,
    id,
  );
}

export async function deleteIncome(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM incomes WHERE id = ?', id);
}

const SELECT_RECURRING_INCOME = `
  SELECT r.id, r.source, r.amount_cop AS amountCop, r.kind, r.pay_day AS payDay,
         r.account_id AS accountId, a.name AS accountName,
         r.starts_on AS startsOn, r.last_posted_on AS lastPostedOn
  FROM recurring_incomes r
  LEFT JOIN accounts a ON a.id = r.account_id`;

type RecurringIncomeRow = Omit<RecurringIncome, 'nextPayOn'>;

function withNextPay(row: RecurringIncomeRow, today: string): RecurringIncome {
  const after = latestDay(addDays(today, -1), row.startsOn, row.lastPostedOn);
  return { ...row, nextPayOn: nextCharge(row.payDay, after) };
}

export async function listRecurringIncomes(
  db: SQLiteDatabase,
  today: string,
): Promise<RecurringIncome[]> {
  const rows = await db.getAllAsync<RecurringIncomeRow>(
    `${SELECT_RECURRING_INCOME} WHERE r.active = 1 ORDER BY r.pay_day, r.id`,
  );
  return rows
    .map((row) => withNextPay(row, today))
    .sort((a, b) => a.nextPayOn.localeCompare(b.nextPayOn));
}

export async function getRecurringIncome(
  db: SQLiteDatabase,
  id: number,
  today: string,
): Promise<RecurringIncome | null> {
  const row = await db.getFirstAsync<RecurringIncomeRow>(
    `${SELECT_RECURRING_INCOME} WHERE r.id = ?`,
    id,
  );
  return row ? withNextPay(row, today) : null;
}

// The first payment is recorded as received, so it starts counting from that day.
export async function addRecurringIncome(
  db: SQLiteDatabase,
  input: RecurringIncomeInput,
  receivedOn: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO recurring_incomes
         (source, amount_cop, kind, pay_day, account_id, starts_on, last_posted_on)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.source.trim(),
      input.amountCop,
      input.kind,
      input.payDay,
      input.accountId,
      receivedOn,
      receivedOn,
    );
    await db.runAsync(
      `INSERT INTO incomes (source, amount_cop, kind, received_on, account_id, recurring_income_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.source.trim(),
      input.amountCop,
      input.kind,
      receivedOn,
      input.accountId,
      result.lastInsertRowId,
    );
  });
}

export async function updateRecurringIncome(
  db: SQLiteDatabase,
  id: number,
  input: RecurringIncomeInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE recurring_incomes
     SET source = ?, amount_cop = ?, kind = ?, pay_day = ?, account_id = ?
     WHERE id = ?`,
    input.source.trim(),
    input.amountCop,
    input.kind,
    input.payDay,
    input.accountId,
    id,
  );
}

// Past payments stay, so the account balance does not change when it stops repeating.
export async function stopRecurringIncome(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE recurring_incomes SET active = 0 WHERE id = ?', id);
}

export async function postDueIncomes(db: SQLiteDatabase, today: string): Promise<void> {
  const items = await db.getAllAsync<RecurringIncomeRow>(
    `${SELECT_RECURRING_INCOME} WHERE r.active = 1`,
  );

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const days = chargesThrough(item.payDay, latestDay(item.startsOn, item.lastPostedOn), today);
      for (const day of days) {
        await db.runAsync(
          `INSERT OR IGNORE INTO incomes
             (source, amount_cop, kind, received_on, account_id, recurring_income_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          item.source,
          item.amountCop,
          item.kind,
          day,
          item.accountId,
          item.id,
        );
      }
      if (days.length > 0) {
        await db.runAsync(
          'UPDATE recurring_incomes SET last_posted_on = ? WHERE id = ?',
          days[days.length - 1],
          item.id,
        );
      }
    }
  });
}
