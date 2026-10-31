import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lastFourDigits, parseAmount, parseBankMessage } from './incoming.ts';

test('parseAmount reads every format Shortcuts may send', () => {
  assert.equal(parseAmount('$128.400'), 128400);
  assert.equal(parseAmount('128,400.00'), 128400);
  assert.equal(parseAmount('128.400,00'), 128400);
  assert.equal(parseAmount('128400'), 128400);
  assert.equal(parseAmount('COP 1.420.300'), 1420300);
  assert.equal(parseAmount('$ 44.900,5'), 44900);
});

test('parseAmount treats missing values as zero', () => {
  assert.equal(parseAmount(undefined), 0);
  assert.equal(parseAmount(''), 0);
  assert.equal(parseAmount('$0'), 0);
  assert.equal(parseAmount('$0,00'), 0);
});

test('lastFourDigits finds the card in a Wallet name', () => {
  assert.equal(lastFourDigits('Visa ••••4417'), '4417');
  assert.equal(lastFourDigits('Bancolombia 1234'), '1234');
  assert.equal(lastFourDigits('Apple Card'), null);
  assert.equal(lastFourDigits(undefined), null);
});

test('parseBankMessage reads an amount and merchant', () => {
  assert.deepEqual(parseBankMessage('Compraste $128.400 en EXITO LAURELES con tu T.Cred *4417'), {
    amountCop: 128400,
    merchant: 'EXITO LAURELES',
  });
});

test('parseBankMessage leaves unknown parts empty', () => {
  assert.deepEqual(parseBankMessage('Tu clave es 1234'), { amountCop: 0, merchant: '' });
});
