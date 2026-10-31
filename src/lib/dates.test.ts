import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, addMonths, formatDay, formatMonth, formatRelativeDay, toDay, toMonth } from './dates.ts';

test('toDay keeps the local calendar date', () => {
  assert.equal(toDay(new Date(2026, 9, 31, 23, 59)), '2026-10-31');
});

test('addDays crosses months and years', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('addMonths crosses years', () => {
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('toMonth takes the month of a day', () => {
  assert.equal(toMonth('2026-10-31'), '2026-10');
});

test('labels match the designs', () => {
  assert.equal(formatMonth('2026-10'), 'October 2026');
  assert.equal(formatDay('2026-10-29'), 'Oct 29');
});

test('formatRelativeDay names today and yesterday', () => {
  assert.equal(formatRelativeDay('2026-10-31', '2026-10-31'), 'Today');
  assert.equal(formatRelativeDay('2026-10-30', '2026-10-31'), 'Yesterday');
  assert.equal(formatRelativeDay('2026-10-29', '2026-10-31'), 'Oct 29');
});
