import type { SQLiteDatabase } from 'expo-sqlite';

export type Account = {
  id: number;
  name: string;
  balanceCop: number;
};

const SELECT_ACCOUNT = 'SELECT id, name, balance_cop AS balanceCop FROM accounts';

export function listAccounts(db: SQLiteDatabase): Promise<Account[]> {
  return db.getAllAsync<Account>(`${SELECT_ACCOUNT} ORDER BY balance_cop DESC`);
}

export function getAccount(db: SQLiteDatabase, id: number): Promise<Account | null> {
  return db.getFirstAsync<Account>(`${SELECT_ACCOUNT} WHERE id = ?`, id);
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
    'UPDATE accounts SET name = ?, balance_cop = ? WHERE id = ?',
    name.trim(),
    balanceCop,
    id,
  );
}

export async function deleteAccount(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
}
