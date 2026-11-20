import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshInbox, parseInbox } from '../src/utils/reminderInbox';
import type { PaymentReminder } from '../src/utils/reminders';
const now = new Date(2026, 10, 17, 12);
const item: PaymentReminder = { key: 'expense:bill', title: 'Descrição privada', dueDate: '2026-11-18', value: 500, kind: 'boleto', month: '2026-11', count: 1, paid: false };

test('in-app notices appear near due date independent of Android permission and never repeat on refresh', () => {
  assert.equal(refreshInbox([], [item], 1, new Date(2026, 10, 16)).length, 0);
  const inbox = refreshInbox([], [item], 1, now);
  assert.equal(inbox.length, 1); assert.equal(inbox[0].stage, 'before');
  assert.deepEqual(refreshInbox(inbox, [item], 1, now), inbox);
  assert.equal(JSON.stringify(inbox).includes('Descrição privada'), false); assert.equal(JSON.stringify(inbox).includes('500'), false);
});
test('mark-read state survives refresh and a due-date notice is a distinct later event', () => {
  const inbox = refreshInbox([], [item], 1, now).map(r => ({ ...r, readAt: now.getTime() }));
  const updated = refreshInbox(inbox, [item], 1, new Date(2026, 10, 18, 9));
  assert.equal(updated.length, 2); assert.equal(updated.find(r => r.stage === 'before')?.readAt, now.getTime());
  assert.equal(updated.find(r => r.stage === 'due')?.readAt, undefined);
});
test('paid notices remain as history, deleted or rescheduled sources are removed, already paid never creates a notice', () => {
  const inbox = refreshInbox([], [item], 1, now), paid = { ...item, paid: true };
  assert.equal(refreshInbox(inbox, [paid], 1, now).length, 1);
  assert.equal(refreshInbox([], [paid], 1, now).length, 0);
  assert.equal(refreshInbox(inbox, [], 1, now).length, 0);
  assert.equal(refreshInbox(inbox, [{ ...item, dueDate: '2026-12-20' }], 1, now).length, 0);
});
test('inbox persistence validates input and retains at most 80 recent references', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ ...item, key: `expense:${i}` }));
  const inbox = refreshInbox([], items, 1, now);
  assert.equal(inbox.length, 80); assert.deepEqual(parseInbox(JSON.stringify(inbox)), inbox);
  assert.deepEqual(parseInbox('{broken'), []); assert.deepEqual(parseInbox('[{"id":"bad"}]'), []);
  assert.equal(refreshInbox(inbox, items.map(i => ({ ...i, paid: true })), 1, new Date(2027, 4, 1)).length, 0);
});
