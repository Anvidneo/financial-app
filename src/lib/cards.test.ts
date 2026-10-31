import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildSchedule,
  cutOffFor,
  dueFor,
  splitInstallments,
  summarizeCard,
  type CardPurchase,
} from './cards.ts';

const cycle = { cutOffDay: 30, paymentDay: 15, limitCop: 6000000 };

const purchase = (overrides: Partial<CardPurchase>): CardPurchase => ({
  id: 1,
  merchant: 'Laptop',
  amountCop: 1200000,
  installments: 12,
  spentOn: '2026-10-12',
  ...overrides,
});

test('cutOffFor keeps cut-off day purchases in that statement', () => {
  assert.equal(cutOffFor('2026-10-29', 30), '2026-10-30');
  assert.equal(cutOffFor('2026-10-30', 30), '2026-10-30');
  assert.equal(cutOffFor('2026-10-31', 30), '2026-11-30');
});

test('cutOffFor handles a cut-off later than the month has days', () => {
  assert.equal(cutOffFor('2026-02-10', 30), '2026-02-28');
  assert.equal(cutOffFor('2026-03-01', 30), '2026-03-30');
});

test('dueFor finds the payment day after the cut-off', () => {
  assert.equal(dueFor('2026-10-30', 15), '2026-11-15');
  assert.equal(dueFor('2026-10-05', 25), '2026-10-25');
  assert.equal(dueFor('2026-12-30', 15), '2027-01-15');
});

test('splitInstallments always adds up to the purchase', () => {
  assert.deepEqual(splitInstallments(1800000, 6), Array(6).fill(300000));
  assert.deepEqual(splitInstallments(100000, 3), [33334, 33333, 33333]);
  assert.deepEqual(splitInstallments(50000, 1), [50000]);
  assert.deepEqual(splitInstallments(100000, 2), [50000, 50000]);
  assert.deepEqual(splitInstallments(100001, 4), [25001, 25000, 25000, 25000]);
});

test('buildSchedule matches the design example', () => {
  const schedule = buildSchedule(1800000, 6, '2026-10-31', cycle);

  assert.equal(schedule.length, 6);
  assert.deepEqual(schedule[0], {
    number: 1,
    count: 6,
    amountCop: 300000,
    cutOffOn: '2026-11-30',
    dueOn: '2026-12-15',
  });
  assert.equal(schedule[1].cutOffOn, '2026-12-30');
  assert.equal(schedule[2].dueOn, '2027-02-15');
});

test('buildSchedule keeps the cut-off day after February', () => {
  const schedule = buildSchedule(300000, 3, '2027-01-31', cycle);
  assert.deepEqual(
    schedule.map((item) => item.cutOffOn),
    ['2027-02-28', '2027-03-30', '2027-04-30'],
  );
});

test('summarizeCard shows the closed statement with one installment of each purchase', () => {
  const summary = summarizeCard(
    cycle,
    [purchase({}), purchase({ id: 2, merchant: 'Restaurant', amountCop: 96000, installments: 1 })],
    [{ cutOffOn: '2026-10-30', minimumCop: 50000, paidOn: null }],
    '2026-10-31',
  );

  assert.equal(summary.statement.cutOffOn, '2026-10-30');
  assert.equal(summary.statement.dueOn, '2026-11-15');
  assert.equal(summary.statement.balanceCop, 196000);
  assert.equal(summary.statement.minimumCop, 50000);
  assert.equal(summary.statement.closed, true);
  assert.equal(summary.statement.items.length, 2);
  assert.equal(summary.statement.items[0].number, 1);
});

test('credit used counts every unpaid future installment', () => {
  const summary = summarizeCard(cycle, [purchase({})], [], '2026-10-31');
  assert.equal(summary.usedCop, 1200000);
  assert.equal(summary.availableCop, 4800000);
});

test('paying a statement frees its installments and moves to the open cycle', () => {
  const summary = summarizeCard(
    cycle,
    [purchase({})],
    [{ cutOffOn: '2026-10-30', minimumCop: null, paidOn: '2026-11-01' }],
    '2026-10-31',
  );

  assert.equal(summary.usedCop, 1100000);
  assert.equal(summary.statement.cutOffOn, '2026-11-30');
  assert.equal(summary.statement.closed, false);
  assert.equal(summary.statement.balanceCop, 100000);
});

test('an overdue statement stays on screen until it is paid', () => {
  const summary = summarizeCard(cycle, [purchase({})], [], '2026-12-20');
  assert.equal(summary.statement.cutOffOn, '2026-10-30');
});

test('a card with no purchases shows the open cycle at zero', () => {
  const summary = summarizeCard(cycle, [], [], '2026-10-31');
  assert.equal(summary.statement.balanceCop, 0);
  assert.equal(summary.statement.cutOffOn, '2026-11-30');
  assert.equal(summary.availableCop, 6000000);
});
