import type { SQLiteDatabase } from 'expo-sqlite';

export type Account = {
  id: number;
  name: string;
  balanceCop: number;
};

// balance_cop stores the starting point, and linked movements are subtracted from it.
// That way editing or deleting an expense always corrects the balance by itself.
const SPENT = `(
  IFNULL((SELECT SUM(e.amount_cop) FROM expenses e WHERE e.account_id = a.id), 0) +
  IFNULL((SELECT SUM(p.amount_cop) FROM card_payments p WHERE p.account_id = a.id), 0)
)`;

const SELECT_ACCOUNT = `SELECT a.id, a.name, a.balance_cop - ${SPENT} AS balanceCop FROM accounts a`;

export function listAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(`${SELECT_ACCOUNT} ORDER BY balanceCop DESC`);
}

export function getAccount(db: SQLiteDatabase, id: number): Promise<Account | null> {
  return db.getFirstAsync<Account>(`${SELECT_ACCOUNT} WHERE a.id = ?`, id);
}

export async function addAccount(
  db: SQLiteDatabase,
  name: string,
  balanceCop: number,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO accounts (name, balance_cop) VALUES (?, ?)',
    name.trim(),
    balanceCop,
  );
}

export async function updateAccount(
  db: SQLiteDatabase,
  id: number,
  name: string,
  balanceCop: number,
): Promise<void> {
  await db.runAsync(
    `UPDATE accounts AS a SET name = ?, balance_cop = ? + ${SPENT} WHERE a.id = ?`,
    name.trim(),
    balanceCop,
    id,
  );
}

export async function deleteAccount(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const table of ['expenses', 'card_payments', 'debit_cards', 'recurring']) {
      await db.runAsync(`UPDATE ${table} SET account_id = NULL WHERE account_id = ?`, id);
    }
    await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
  });
}
