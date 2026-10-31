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
  `
  ALTER TABLE recurring ADD COLUMN last_posted_on TEXT;

  UPDATE recurring
  SET last_posted_on = (SELECT MAX(e.spent_on) FROM expenses e WHERE e.recurring_id = recurring.id);
  `,
  `
  CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    last_four TEXT NOT NULL,
    limit_cop INTEGER NOT NULL CHECK (limit_cop > 0),
    cut_off_day INTEGER NOT NULL CHECK (cut_off_day BETWEEN 1 AND 31),
    payment_day INTEGER NOT NULL CHECK (payment_day BETWEEN 1 AND 31)
  );

  CREATE TABLE card_statements (
    card_id INTEGER NOT NULL REFERENCES cards (id),
    cut_off_on TEXT NOT NULL,
    minimum_cop INTEGER,
    paid_on TEXT,
    PRIMARY KEY (card_id, cut_off_on)
  );

  ALTER TABLE expenses ADD COLUMN card_id INTEGER REFERENCES cards (id);
  ALTER TABLE expenses ADD COLUMN installments INTEGER NOT NULL DEFAULT 1;
  `,
  `
  ALTER TABLE expenses ADD COLUMN payment_method TEXT;

  UPDATE expenses SET payment_method = 'card' WHERE card_id IS NOT NULL;
  `,
  `
  CREATE TABLE debit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    last_four TEXT NOT NULL
  );

  ALTER TABLE expenses ADD COLUMN debit_card_id INTEGER REFERENCES debit_cards (id);
  `,
  `
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance_cop INTEGER NOT NULL
  );
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
