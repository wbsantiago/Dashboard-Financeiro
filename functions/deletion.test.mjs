import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deletionIdentity, processDeletion } from './deletion.mjs';

test('requires a recent Google session; derives identity from verified token', () => {
  const now = 1000000, token = { auth_time: 990, firebase: { sign_in_provider: 'google.com' } };
  assert.equal(deletionIdentity({ uid: 'owner', token }, now), 'owner');
  for (const auth of [null, { uid: 'owner', token: {} }, { uid: 'owner', token: { ...token, auth_time: 1 } }, { uid: 'owner', token: { ...token, auth_time: 99999 } }, { uid: 'owner', token: { ...token, firebase: { sign_in_provider: 'password' } } }]) assert.throws(() => deletionIdentity(auth, now));
});

function fixture(failAt) {
  const calls = [], job = { state: 'requested' };
  const driver = Object.fromEntries(['processing', 'disableAccount', 'deleteFinancialTree', 'deleteAuthAccount', 'completed', 'retryPending'].map(name => [name, async uid => { assert.equal(uid, 'owner'); calls.push(name); if (failAt === name) throw new Error('simulated failure'); if (name === 'completed') job.state = 'completed'; }]));
  driver.readJob = async uid => { assert.equal(uid, 'owner'); return job; };
  return { driver, calls, job };
}
test('deletes financial tree before Auth and marks completion last', async () => {
  const { driver, calls } = fixture(); await processDeletion('owner', driver);
  assert.deepEqual(calls, ['processing', 'disableAccount', 'deleteFinancialTree', 'deleteAuthAccount', 'completed']);
});
test('redelivery of completed job does nothing', async () => {
  const { driver, calls, job } = fixture(); job.state = 'completed'; await processDeletion('owner', driver); assert.deepEqual(calls, []);
});
for (const failAt of ['disableAccount', 'deleteFinancialTree', 'deleteAuthAccount', 'completed']) test(`failure at ${failAt} remains retryable`, async () => {
  const { driver, calls } = fixture(failAt); await assert.rejects(processDeletion('owner', driver));
  assert.equal(calls.at(-1), 'retryPending');
  if (failAt === 'deleteFinancialTree') assert.ok(!calls.includes('deleteAuthAccount'));
});
