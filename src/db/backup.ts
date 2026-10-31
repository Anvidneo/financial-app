import type { SQLiteDatabase } from 'expo-sqlite';

type Row = Record<string, string | number | null>;

type Backup = {
  app: 'finance';
  version: number;
  tables: Record<string, Row[]>;
};

// Parents first, so a restore inserts in this order and deletes in reverse.
const TABLES = [
  'categories',
  'accounts',
  'debit_cards',
  'cards',
  'recurring',
  'expenses',
  'card_statements',
  'card_payments',
  'settings',
];
const REQUIRED_TABLES = ['categories', 'expenses', 'recurring', 'cards'];

async function schemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function createBackup(db: SQLiteDatabase): Promise<string> {
  const tables: Backup['tables'] = {};
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
  }
  const backup: Backup = { app: 'finance', version: await schemaVersion(db), tables };
  return JSON.stringify(backup);
}

function parseBackup(text: string): Backup {
  let backup: Partial<Backup>;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Finance backup.');
  }
  if (backup.app !== 'finance' || !backup.tables) {
    throw new Error('This file is not a Finance backup.');
  }
  if (REQUIRED_TABLES.some((table) => !Array.isArray(backup.tables?.[table]))) {
    throw new Error('This backup is incomplete.');
  }
  return backup as Backup;
}

// Runs in one transaction, so a backup that fails partway leaves the current data untouched.
export async function restoreBackup(db: SQLiteDatabase, text: string): Promise<void> {
  const backup = parseBackup(text);
  if (backup.version > (await schemaVersion(db))) {
    throw new Error('This backup comes from a newer app version. Update the app first.');
  }
  // Older backups stay usable: columns added since keep their defaults.
  const tables = TABLES.filter((table) => Array.isArray(backup.tables[table]));

  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA defer_foreign_keys = ON');
    for (const table of [...TABLES].reverse()) {
      if (table !== 'settings' || tables.includes(table)) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
    }
    for (const table of tables) {
      for (const row of backup.tables[table]) {
        const columns = Object.keys(row);
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((column) => row[column]),
        );
      }
    }
  });
}
