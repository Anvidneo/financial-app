import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toCsv } from './csv.ts';

test('toCsv writes plain rows', () => {
  assert.equal(toCsv([['Date', 'Amount'], ['2026-10-29', 128400]]), 'Date,Amount\n2026-10-29,128400');
});

test('toCsv quotes commas, quotes and line breaks', () => {
  assert.equal(toCsv([['Pan, leche', 'El "Mono"', 'a\nb']]), '"Pan, leche","El ""Mono""","a\nb"');
});
