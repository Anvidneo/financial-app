import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paymentLabel } from './payment.ts';

test('paymentLabel names each method', () => {
  assert.equal(paymentLabel('cash', null), 'Cash');
  assert.equal(paymentLabel('transfer', null), 'Transfer');
  assert.equal(paymentLabel('apple_pay', null), 'Apple Pay');
});

test('paymentLabel shows the card used', () => {
  assert.equal(paymentLabel('card', 'Visa 4417'), 'Visa 4417');
});

test('paymentLabel shows the debit card used, or the method without one', () => {
  assert.equal(paymentLabel('debit', 'Bancolombia 1234'), 'Bancolombia 1234');
  assert.equal(paymentLabel('debit', null), 'Debit card');
});

test('paymentLabel stays empty for older expenses', () => {
  assert.equal(paymentLabel(null, null), null);
});
