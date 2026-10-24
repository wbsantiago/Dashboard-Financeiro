import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMonthlyOccurrences, readRecurrenceFields, selectRecurringItems, shiftMonthlyDate,
  updateRecurringItems, validateRecurrenceMonths } from '../src/utils/recurrence';
import { getCompetenceMonth, getInstallmentInfo } from '../src/utils/format';
import { INITIAL_MOCK_DATA, importDataFromJSON } from '../src/utils/storage';

const expense = { title: 'Estacionamento', value: 150, category: 'Transporte',
  date: '2026-01-31', month: '2026-01', isInstallment: false, paid: false };

test('monthly amounts are repeated in full and each series has its own identity', () => {
  const first = createMonthlyOccurrences(expense, 12, 'exp');
  const second = createMonthlyOccurrences(expense, 12, 'exp');
  assert.equal(first.length, 12);
  assert.equal(first.reduce((sum, item) => sum + item.value, 0), 1800);
  assert.equal(new Set(first.map(item => item.id)).size, 12);
  assert.equal(new Set(first.map(item => item.recurrenceId)).size, 1);
  assert.notEqual(first[0].recurrenceId, second[0].recurrenceId);
  assert.ok(first.every(item => !item.isInstallment && item.paid === false));
  assert.deepEqual(first.map(item => item.recurrenceIndex), Array.from({ length: 12 }, (_, i) => i + 1));
});

test('month-end dates clamp without drifting, including leap years and year boundaries', () => {
  assert.deepEqual(createMonthlyOccurrences(expense, 3, 'exp').map(item => item.date),
    ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(shiftMonthlyDate('2028-01-31', 1), '2028-02-29');
  assert.equal(shiftMonthlyDate('2026-12-31', 1), '2027-01-31');
  assert.throws(() => shiftMonthlyDate('2026-02-30', 1));
  assert.throws(() => shiftMonthlyDate('', 1));
});

test('duration is bounded, finite, and includes the first month', () => {
  for (const invalid of [0, -1, 121, 2.5, NaN, Infinity]) assert.throws(() => validateRecurrenceMonths(invalid));
  assert.equal(createMonthlyOccurrences(expense, 1, 'exp').length, 1);
  assert.equal(createMonthlyOccurrences(expense, 120, 'exp').length, 120);
  for (const value of [0, -1, Infinity, NaN]) {
    assert.throws(() => createMonthlyOccurrences({ ...expense, value }, 12, 'exp'));
  }
});

test('expense recurrence respects existing accounting periods and revenue uses calendar months', () => {
  const draft = { ...expense, date: '2026-01-03' };
  const expenses = createMonthlyOccurrences(draft, 3, 'exp', date => getCompetenceMonth(date, [], 5));
  const revenues = createMonthlyOccurrences(draft, 3, 'rev');
  assert.deepEqual(expenses.map(item => item.month), ['2025-12', '2026-01', '2026-02']);
  assert.deepEqual(revenues.map(item => item.month), ['2026-01', '2026-02', '2026-03']);
});

test('single edits affect one occurrence and future edits preserve history and other series', () => {
  const first = createMonthlyOccurrences(expense, 4, 'exp');
  const second = createMonthlyOccurrences(expense, 4, 'exp');
  const all = [...first, ...second];
  assert.deepEqual(selectRecurringItems(all, first[1], 'single').map(item => item.id), [first[1].id]);
  assert.deepEqual(selectRecurringItems(all, first[1], 'future').map(item => item.id), first.slice(1).map(item => item.id));
  const changed = updateRecurringItems(all, first[1], { value: 200, date: first[1].date }, 'future');
  assert.equal(changed.length, 3);
  assert.ok(changed.every(item => item.value === 200));
  assert.deepEqual(changed.map(item => item.date), ['2026-02-28', '2026-03-31', '2026-04-30']);
  assert.equal(first[0].value, 150);
  assert.ok(second.every(item => item.value === 150));
});

test('changing the date of future occurrences preserves their monthly spacing and payment status', () => {
  const items = createMonthlyOccurrences(expense, 4, 'exp');
  items[2].paid = true;
  const changed = updateRecurringItems(items, items[1], { value: 250, date: '2026-02-15' }, 'future');
  assert.deepEqual(changed.map(item => item.date), ['2026-02-15', '2026-03-15', '2026-04-15']);
  assert.deepEqual(changed.map(item => item.paid), [false, true, false]);
  assert.deepEqual(changed.map(item => item.recurrenceIndex), [2, 3, 4]);
  assert.equal(items[0].date, '2026-01-31');
});

test('legacy entries remain valid and incomplete recurrence metadata is rejected', () => {
  assert.deepEqual(readRecurrenceFields({}), {});
  assert.throws(() => readRecurrenceFields({ recurrenceMonths: 12 }));
  assert.throws(() => readRecurrenceFields({ recurrenceId: 'a/b', recurrenceIndex: 1, recurrenceMonths: 12 }));
  assert.throws(() => readRecurrenceFields({ recurrenceId: 'series', recurrenceIndex: 13, recurrenceMonths: 12 }));
  assert.throws(() => readRecurrenceFields({ recurrenceId: 'series', recurrenceIndex: 1, recurrenceMonths: 121 }));
  assert.throws(() => readRecurrenceFields({ recurrenceId: 'series', recurrenceIndex: 1, recurrenceMonths: 12, isInstallment: true }));
});

test('backup round-trip preserves recurrence groups for expenses and revenues', () => {
  const expenses = createMonthlyOccurrences(expense, 3, 'exp');
  const revenues = createMonthlyOccurrences({ ...expense, title: 'Salário', value: 4000 }, 3, 'rev');
  const restored = importDataFromJSON(JSON.stringify({ ...INITIAL_MOCK_DATA, expenses, revenues }));
  assert.deepEqual(restored.expenses.map(readRecurrenceFields), expenses.map(readRecurrenceFields));
  assert.deepEqual(restored.revenues!.map(readRecurrenceFields), revenues.map(readRecurrenceFields));
  assert.equal(selectRecurringItems(restored.expenses, restored.expenses[1], 'future').length, 2);
});

test('recurring titles are never mistaken for installment descriptions', () => {
  const recurring = createMonthlyOccurrences({ ...expense, title: 'Serviço 13/20' }, 3, 'exp')[0];
  assert.equal(getInstallmentInfo(recurring).hasInfo, false);
  assert.equal(getInstallmentInfo({ ...expense, isInstallment: true, currentInstallment: 1, totalInstallments: 3 }).hasInfo, true);
});
