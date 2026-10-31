import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chargeDayInMonth,
  chargesThrough,
  daysBetween,
  latestDay,
  nextCharge,
  planReminders,
} from './billing.ts';

const source = {
  id: 1,
  name: 'Netflix',
  amountCop: 44900,
  billingDay: 2,
  remindDays: 3,
  remindersOn: true,
  after: '2026-10-30',
};

test('chargeDayInMonth moves late days to the end of short months', () => {
  assert.equal(chargeDayInMonth('2026-10', 31), '2026-10-31');
  assert.equal(chargeDayInMonth('2026-11', 31), '2026-11-30');
  assert.equal(chargeDayInMonth('2026-02', 29), '2026-02-28');
  assert.equal(chargeDayInMonth('2028-02', 29), '2028-02-29');
});

test('nextCharge finds the first charge after a day', () => {
  assert.equal(nextCharge(2, '2026-10-31'), '2026-11-02');
  assert.equal(nextCharge(25, '2026-10-20'), '2026-10-25');
  assert.equal(nextCharge(25, '2026-10-25'), '2026-11-25');
  assert.equal(nextCharge(31, '2026-12-31'), '2027-01-31');
});

test('nextCharge keeps day 31 after a short month', () => {
  assert.equal(nextCharge(31, '2026-11-30'), '2026-12-31');
});

test('chargesThrough lists every missed charge once', () => {
  assert.deepEqual(chargesThrough(5, '2026-09-10', '2026-11-05'), ['2026-10-05', '2026-11-05']);
  assert.deepEqual(chargesThrough(5, '2026-11-05', '2026-11-05'), []);
});

test('daysBetween counts calendar days across a month', () => {
  assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2);
  assert.equal(daysBetween('2026-10-31', '2026-10-31'), 0);
});

test('latestDay ignores missing days', () => {
  assert.equal(latestDay('2026-10-01', null, '2026-10-20'), '2026-10-20');
});

test('planReminders schedules before each charge and skips past days', () => {
  const planned = planReminders([source], '2026-10-31', 2);
  assert.deepEqual(
    planned.map((item) => [item.remindOn, item.chargeDay]),
    [['2026-11-29', '2026-12-02']],
  );

  const later = planReminders([source], '2026-10-29', 2);
  assert.equal(later[0].remindOn, '2026-10-30');
  assert.equal(later[0].chargeDay, '2026-11-02');
});

test('planReminders respects the switch and the iOS limit', () => {
  assert.deepEqual(planReminders([{ ...source, remindersOn: false }], '2026-10-29'), []);

  const many = Array.from({ length: 30 }, (_, index) => ({ ...source, id: index }));
  assert.equal(planReminders(many, '2026-10-29').length, 60);
});
