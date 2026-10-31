import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  addMonths,
  formatDay,
  formatMonth,
  formatRelativeDay,
  formatShortMonth,
  greeting,
  lastMonths,
  toDay,
  toMonth,
} from './dates.ts';

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

test('lastMonths ends on the given month and crosses years', () => {
  assert.deepEqual(lastMonths('2026-02', 4), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.equal(formatShortMonth('2026-10'), 'Oct');
});

test('greeting follows the time of day', () => {
  assert.equal(greeting(9), 'Good morning');
  assert.equal(greeting(12), 'Good afternoon');
  assert.equal(greeting(20), 'Good evening');
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
