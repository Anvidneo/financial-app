import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bytesToText, parseProfileExpiry } from './signing.ts';

test('parseProfileExpiry reads the date from a signing profile', () => {
  const profile = 'x<key>ExpirationDate</key>\n\t<date>2026-11-07T15:32:50Z</date>y';
  assert.equal(parseProfileExpiry(profile)?.toISOString(), '2026-11-07T15:32:50.000Z');
});

test('parseProfileExpiry is empty without a profile', () => {
  assert.equal(parseProfileExpiry('nothing here'), null);
  assert.equal(parseProfileExpiry('<key>ExpirationDate</key><date>soon</date>'), null);
});

test('bytesToText keeps every byte of a large file', () => {
  const bytes = new Uint8Array(20000).fill(65);
  assert.equal(bytesToText(bytes).length, 20000);
});
