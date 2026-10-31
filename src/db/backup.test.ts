import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import type { SQLiteDatabase } from 'expo-sqlite';

import { createBackup, restoreBackup } from './backup.ts';
import { MIGRATIONS } from './schema.ts';

function openDatabase(): { sql: DatabaseSync; db: SQLiteDatabase } {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys = ON');
  for (const migration of MIGRATIONS) sql.exec(migration);
  sql.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);

  const db = {
    execAsync: async (query: string) => sql.exec(query),
    getAllAsync: async (query: string) => sql.prepare(query).all(),
    getFirstAsync: async (query: string) => sql.prepare(query).get(),
    runAsync: async (query: string, params: unknown[] = []) =>
      sql.prepare(query).run(...(params as never[])),
    withTransactionAsync: async (task: () => Promise<void>) => {
      sql.exec('BEGIN');
      try {
        await task();
        sql.exec('COMMIT');
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { sql, db: db as unknown as SQLiteDatabase };
}

function seed(sql: DatabaseSync) {
  sql.exec(`
    INSERT INTO cards (name, last_four, limit_cop, cut_off_day, payment_day)
      VALUES ('Visa', '4417', 6000000, 30, 15);
    INSERT INTO accounts (name, balance_cop) VALUES ('Savings', 3250000);
    INSERT INTO recurring (name, amount_cop, category_id, billing_day, starts_on)
      VALUES ('Netflix', 44900, 4, 2, '2026-08-10');
    INSERT INTO expenses (merchant, amount_cop, category_id, spent_on, card_id, installments, recurring_id)
      VALUES ('Laptop', 1200000, 5, '2026-10-12', 1, 12, 1);
    INSERT INTO card_statements (card_id, cut_off_on, paid_on) VALUES (1, '2026-10-30', '2026-11-01');
  `);
}

const count = (sql: DatabaseSync, table: string) =>
  (sql.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number }).total;

test('a backup restores every table into an empty app', async () => {
  const source = openDatabase();
  seed(source.sql);
  const backup = await createBackup(source.db);

  const target = openDatabase();
  await restoreBackup(target.db, backup);

  for (const table of ['cards', 'accounts', 'recurring', 'expenses', 'card_statements']) {
    assert.equal(count(target.sql, table), 1, table);
  }
  assert.equal(count(target.sql, 'categories'), 6);
  assert.deepEqual(target.sql.prepare('PRAGMA foreign_key_check').all(), []);
});

test('restore replaces existing data instead of merging', async () => {
  const source = openDatabase();
  seed(source.sql);
  const backup = await createBackup(source.db);

  await restoreBackup(source.db, backup);
  assert.equal(count(source.sql, 'expenses'), 1);
});

test('a broken backup leaves the data untouched', async () => {
  const { sql, db } = openDatabase();
  seed(sql);
  const backup = JSON.parse(await createBackup(db));
  backup.tables.expenses[0].no_such_column = 1;

  await assert.rejects(restoreBackup(db, JSON.stringify(backup)));
  assert.equal(count(sql, 'expenses'), 1);
  assert.equal(count(sql, 'cards'), 1);
});

test('restore refuses other files and other versions', async () => {
  const { db } = openDatabase();
  await assert.rejects(restoreBackup(db, 'not json'), /not a Finance backup/);
  await assert.rejects(restoreBackup(db, '{"app":"other"}'), /not a Finance backup/);

  const backup = JSON.parse(await createBackup(db));
  backup.version = 1;
  await assert.rejects(restoreBackup(db, JSON.stringify(backup)), /different app version/);
});
