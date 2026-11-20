import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

test('emulators: deletion owns its UID, blocks stale sessions, removes >500 records, preserves other account, and retries safely', async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  assert.ok(projectId?.startsWith('demo-'), 'This test requires an isolated demo project.');
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Never connect to real Firebase.');
  const env = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  const { requestAccountDeletion, deleteRequestedAccount } = await import('./index.mjs');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');
  const db = getFirestore(), auth = getAuth();
  const owner = 'disposable-owner', other = 'untouched-other';
  const a = env.authenticatedContext(owner).firestore(), b = env.authenticatedContext(other).firestore();
  try {
    await auth.createUser({ uid: owner, email: 'owner@example.invalid' });
    await auth.createUser({ uid: other, email: 'other@example.invalid' });
    await db.doc(`users/${owner}`).set({ uid: owner, categoryBudgets: [] });
    await db.doc(`users/${other}`).set({ uid: other, retained: true });
    const writer = db.bulkWriter();
    for (let i = 0; i < 551; i++) writer.set(db.doc(`users/${owner}/${i < 300 ? 'expenses' : 'revenues'}/fixture-${i}`), { id: `fixture-${i}`, value: 1 });
    await writer.close();
    await assertSucceeds(getDoc(doc(a, 'users', owner)));
    await assertFails(getDoc(doc(b, 'users', owner)));
    await assertFails(setDoc(doc(a, 'accountDeletionRequests', owner), { state: 'completed' }));
    await assert.rejects(requestAccountDeletion.run({ auth: { uid: owner, token: { auth_time: 1 } }, data: { uid: other } }));
    assert.equal((await db.doc(`accountDeletionRequests/${owner}`).get()).exists, false);
    const identity = { uid: owner, token: { auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'google.com' } } };
    assert.deepEqual(await requestAccountDeletion.run({ auth: identity, data: { uid: other } }), { accepted: true });
    await requestAccountDeletion.run({ auth: identity }); // Duplicate acceptance is idempotent.
    assert.equal((await db.doc(`accountDeletionRequests/${other}`).get()).exists, false);
    await assertSucceeds(getDoc(doc(a, 'accountDeletionRequests', owner)));
    await assertFails(getDoc(doc(a, 'users', owner)));
    await assertFails(setDoc(doc(a, 'users', owner), { uid: owner }));
    await assertSucceeds(getDoc(doc(b, 'users', other)));
    await deleteRequestedAccount.run({ params: { uid: owner } });
    assert.equal((await db.doc(`users/${owner}`).get()).exists, false);
    for (const part of ['expenses', 'revenues']) assert.equal((await db.collection(`users/${owner}/${part}`).get()).size, 0);
    await assert.rejects(auth.getUser(owner), error => error.code === 'auth/user-not-found');
    assert.equal((await auth.getUser(other)).disabled, false);
    assert.equal((await db.doc(`users/${other}`).get()).data().retained, true);
    const job = (await db.doc(`accountDeletionRequests/${owner}`).get()).data();
    assert.equal(job.state, 'completed'); assert.equal(job.attempts, 1); assert.ok(job.expiresAt.toMillis() > Date.now());
    await deleteRequestedAccount.run({ params: { uid: owner } });
    assert.equal((await db.doc(`accountDeletionRequests/${owner}`).get()).data().attempts, 1);
    await assertFails(setDoc(doc(a, 'users', owner), { uid: owner }));
  } finally { await env.cleanup(); }
});
