import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appendDigits, formatCop, removeLastDigit } from './money.ts';

test('formatCop uses Colombian thousands separators', () => {
  assert.equal(formatCop(0), '$0');
  assert.equal(formatCop(900), '$900');
  assert.equal(formatCop(44900), '$44.900');
  assert.equal(formatCop(1420300), '$1.420.300');
  assert.equal(formatCop(-23600), '-$23.600');
});

test('appendDigits builds the amount from keypad presses', () => {
  assert.equal(appendDigits(0, '5'), 5);
  assert.equal(appendDigits(5, '0'), 50);
  assert.equal(appendDigits(128, '000'), 128000);
  assert.equal(appendDigits(0, '000'), 0);
});

test('appendDigits ignores input past the digit limit', () => {
  assert.equal(appendDigits(999999999999, '1'), 999999999999);
});

test('removeLastDigit deletes one digit', () => {
  assert.equal(removeLastDigit(1284), 128);
  assert.equal(removeLastDigit(7), 0);
  assert.equal(removeLastDigit(0), 0);
});
