import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Expense } from '../src/types';
import { getCardFilterOptions, matchesCardFilter } from '../src/utils/expenseFilters';

const entry = (fields: Partial<Expense>): Expense => ({
  id: 'expense', title: 'Compra', value: 100, category: 'Alimentação', month: '2026-10',
  date: '2026-10-10', createdAt: 1, isInstallment: false, ...fields,
});
const cards = [
  { id: 'a', name: 'Pessoal', lastDigits: '1234' },
  { id: 'b', name: 'Trabalho', lastDigits: '1234' },
];

test('card filters use the saved identifier even when cards share their last four digits', () => {
  const options = getCardFilterOptions([], cards);
  assert.equal(options.length, 2);
  assert.ok(matchesCardFilter(entry({ cardId: 'a', cardLastDigits: '1234' }), 'id:a', options));
  assert.ok(!matchesCardFilter(entry({ cardId: 'b', cardLastDigits: '1234' }), 'id:a', options));
  assert.ok(!matchesCardFilter(entry({ paymentMethod: 'pix' }), 'id:a', options));
  assert.ok(matchesCardFilter(entry({ paymentMethod: 'pix' }), 'all', options));
});

test('historical cards remain filterable, including older entries with digits only', () => {
  const legacy = entry({ cardLastDigits: '9876' });
  const removed = entry({ cardId: 'removed', cardLastDigits: '5555', cardNickname: 'Antigo' });
  const options = getCardFilterOptions([legacy, legacy, removed, entry({ paymentMethod: 'pix' })], cards);
  assert.equal(options.length, 4);
  assert.ok(matchesCardFilter(legacy, 'digits:9876', options));
  assert.ok(matchesCardFilter(removed, 'id:removed', options));
  assert.ok(!matchesCardFilter(legacy, 'id:removed', options));
  assert.ok(!matchesCardFilter(legacy, 'missing', options));
  // Older rows can still use an existing card's last digits when they lack a saved identifier.
  assert.ok(matchesCardFilter(entry({ cardLastDigits: '1234' }), 'id:a', options));
});
