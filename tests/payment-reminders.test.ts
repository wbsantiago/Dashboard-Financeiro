import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleConfiguration, invoiceDueDate, validDate } from '../src/utils/paymentDates';
import { getCompetenceMonth } from '../src/utils/format';
import { createMonthlyOccurrences, updateRecurringItems } from '../src/utils/recurrence';
import { paymentReminders, reminderAlarms, reminderPreferences } from '../src/utils/reminders';
import { INITIAL_MOCK_DATA, importDataFromJSON } from '../src/utils/storage';
import type { AppData, CreditCard, Expense } from '../src/types';

const card: CreditCard = { id: 'xp', name: 'XP', lastDigits: '1234', closingDay: 3, dueDay: 10 };
const expense = (changes: Partial<Expense> = {}): Expense => ({ id: 'e1', title: 'Conta', value: 50, category: 'Outros', date: '2026-11-03', month: '2026-10', createdAt: 1, isInstallment: false, paymentMethod: 'boleto', dueDate: '2026-11-10', ...changes });
const data = (expenses: Expense[] = [], changes: Partial<AppData> = {}): AppData => ({ ...structuredClone(INITIAL_MOCK_DATA), expenses, creditCards: [card], ...changes });

test('principal overrides legacy monthly closing without modifying recorded historical months', () => {
  const state = data([expense()], { monthlyBudgets: [{ month: '2026-11', salary: 100, targetSavingsPercentage: 10, cardClosingDay: 20 }], primaryCardId: 'xp' });
  const before = structuredClone(state);
  const config = cycleConfiguration(state);
  assert.equal(getCompetenceMonth('2026-11-05', config.budgets, config.closingDay), '2026-11');
  state.creditCards![0] = { ...card, closingDay: 6 };
  const changed = cycleConfiguration(state);
  assert.equal(getCompetenceMonth('2026-11-05', changed.budgets, changed.closingDay), '2026-10');
  state.creditCards![0] = { ...card, closingDay: 3 };
  assert.equal(getCompetenceMonth('2026-11-05', cycleConfiguration(state).budgets, cycleConfiguration(state).closingDay), '2026-11');
  assert.deepEqual(state.expenses, before.expenses);
  assert.equal(cycleConfiguration({ ...state, primaryCardId: null }).budgets[0].cardClosingDay, 20);
  assert.equal(cycleConfiguration({ ...state, primaryCardId: 'missing' }).closingDay, 5);
});
test('each card invoice uses its own closing and due dates, including purchase on closing and year rollover', () => {
  assert.equal(invoiceDueDate(expense(), card), '2026-11-10');
  assert.equal(invoiceDueDate(expense({ date: '2026-11-04' }), card), '2026-12-10');
  assert.equal(invoiceDueDate(expense({ date: '2026-12-20' }), card), '2027-01-10');
  assert.equal(invoiceDueDate(expense({ date: '2026-11-04' }), { ...card, closingDay: 20, dueDay: 5 }), '2026-12-05');
  assert.equal(invoiceDueDate(expense({ date: '2026-02-27' }), { ...card, closingDay: 25, dueDay: 31 }), '2026-03-31');
  assert.equal(invoiceDueDate(expense({ date: '2028-02-01' }), { ...card, closingDay: 25, dueDay: 31 }), '2028-02-29');
  assert.equal(invoiceDueDate(expense(), { ...card, dueDay: undefined }), null);
  assert.equal(validDate('2026-02-30'), false);
});
test('pending invoice grouping excludes paid rows, preserves legacy ambiguity, and never reassigns deleted card IDs', () => {
  const entries = [expense({ paymentMethod: 'card', cardId: 'xp' }), expense({ id: 'e2', paymentMethod: 'card', cardId: 'xp', value: 20 }), expense({ id: 'paid', paymentMethod: 'card', cardId: 'xp', paid: true }), expense({ id: 'deleted', paymentMethod: 'card', cardId: 'deleted', cardLastDigits: '1234' })];
  const items = paymentReminders(data(entries));
  assert.equal(items.length, 1); assert.equal(items[0].value, 70); assert.equal(items[0].count, 2);
  assert.equal(paymentReminders(data([expense({ paymentMethod: 'card', cardLastDigits: '1234' })], { creditCards: [card, { ...card, id: 'duplicate' }] })).length, 0);
  assert.equal(paymentReminders(data([expense({ paymentMethod: 'card', cardLastDigits: '1234' })])).length, 1);
});
test('boleto/Pix reminders require explicit due dates and clear when paid, deleted or date removed', () => {
  const state = data([expense(), expense({ id: 'pix', paymentMethod: 'pix', cardLastDigits: 'old-stale-digits', dueDate: '2026-11-12' }), expense({ id: 'old', dueDate: undefined })]);
  assert.deepEqual(paymentReminders(state).map(i => i.kind), ['boleto', 'pix']);
  assert.equal(paymentReminders({ ...state, expenses: state.expenses.map(e => ({ ...e, paid: true })) }).length, 0);
  assert.equal(paymentReminders({ ...state, expenses: [] }).length, 0);
  assert.equal(paymentReminders(data([expense({ dueDate: null })])).length, 0);
});
test('recurring due dates advance independently, clamp February and preserve March original day', () => {
  const series = createMonthlyOccurrences({ ...expense({ date: '2026-01-10', month: '2026-01', dueDate: '2026-01-31' }) }, 3, 'exp');
  assert.deepEqual(series.map(e => e.dueDate), ['2026-01-31', '2026-02-28', '2026-03-31']);
  const changed = updateRecurringItems(series, series[1], { dueDate: '2026-02-20' }, 'future');
  assert.deepEqual(changed.map(e => e.dueDate), ['2026-02-20', '2026-03-20']);
  assert.equal(series[0].dueDate, '2026-01-31');
  assert.deepEqual(updateRecurringItems(series, series[1], { dueDate: null }, 'future').map(e => e.dueDate), [null, null]);
});
test('backup round-trip retains due dates, cards and principal; old backups do not invent dates or a principal', () => {
  const current = data([expense()], { primaryCardId: card.id });
  const restored = importDataFromJSON(JSON.stringify(current));
  assert.equal(restored.primaryCardId, card.id); assert.deepEqual(restored.creditCards, [card]); assert.equal(restored.expenses[0].dueDate, '2026-11-10');
  const old = importDataFromJSON(JSON.stringify(INITIAL_MOCK_DATA));
  assert.equal(old.primaryCardId, undefined);
  for (const changed of [data([expense({ dueDate: '2026-02-30' })]), data([], { creditCards: [{ ...card, dueDay: 32 }] }), data([], { primaryCardId: 'unknown' })]) assert.throws(() => importDataFromJSON(JSON.stringify(changed)));
});
test('alarms are local daytime summaries, deduplicate dates, omit past/paid, and remain inside rolling 90-day horizon', () => {
  const items = paymentReminders(data([expense(), expense({ id: 'same-day' }), expense({ id: 'distant', dueDate: '2027-07-01' })]));
  const prefs = { enabled: true, daysBefore: 1, time: '09:30' };
  const now = new Date(2026, 10, 8, 12);
  const alarms = reminderAlarms(items, prefs, now);
  assert.equal(alarms.length, 2);
  assert.deepEqual(alarms.map(a => [a.at.getDate(), a.at.getHours(), a.at.getMinutes()]), [[9, 9, 30], [10, 9, 30]]);
  assert.equal(reminderAlarms(items, prefs, new Date(2026, 10, 10, 12)).length, 1); // retain an inexact pending alarm from today
  assert.deepEqual(reminderAlarms(items, prefs, new Date(2026, 10, 11, 12)), []);
  assert.deepEqual(reminderAlarms(items, { ...prefs, enabled: false }, now), []);
  assert.equal(reminderAlarms(items, { ...prefs, daysBefore: 0 }, now).length, 1);
  assert.equal(reminderAlarms(items, prefs, now)[0].id, alarms[0].id);
  assert.deepEqual(reminderPreferences({ enabled: 'yes', daysBefore: 99, time: '99:99' }), { enabled: false, daysBefore: 1, time: '09:00' });
});
