import type { SQLiteDatabase } from 'expo-sqlite';

// Append only. Each entry runs once, in order, and user_version records the last one applied.
// Editing a shipped migration would leave the phone's data out of step with the code.
const MIGRATIONS = [
  `
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    tint TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant TEXT NOT NULL,
    amount_cop INTEGER NOT NULL CHECK (amount_cop > 0),
    category_id INTEGER NOT NULL REFERENCES categories (id),
    spent_on TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX expenses_spent_on ON expenses (spent_on);

  INSERT INTO categories (name, icon, color, tint, sort_order) VALUES
    ('Food', 'bag', '#1C7A43', '#E3F6E9', 1),
    ('Services', 'bolt', '#2F6FED', '#E6F0FD', 2),
    ('Transport', 'car', '#A76A00', '#FFF4DE', 3),
    ('Subscriptions', 'play.circle', '#7A3FD1', '#F1E9FD', 4),
    ('Shopping', 'house', '#C93A3A', '#FDECEC', 5),
    ('Health', 'heart', '#11707A', '#E2F4F4', 6);
  `,
  `
  CREATE TABLE recurring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount_cop INTEGER NOT NULL CHECK (amount_cop > 0),
    category_id INTEGER NOT NULL REFERENCES categories (id),
    billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
    remind_days INTEGER NOT NULL DEFAULT 3,
    reminders_on INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    starts_on TEXT NOT NULL
  );

  ALTER TABLE expenses ADD COLUMN recurring_id INTEGER REFERENCES recurring (id);

  CREATE UNIQUE INDEX expenses_recurring_charge
    ON expenses (recurring_id, spent_on)
    WHERE recurring_id IS NOT NULL;
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  for (let index = version; index < MIGRATIONS.length; index += 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[index]);
      await db.execAsync(`PRAGMA user_version = ${index + 1}`);
    });
  }
}
