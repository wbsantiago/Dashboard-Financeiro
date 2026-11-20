import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { initializeApp as initializeAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, setDoc } from 'firebase/firestore';

test('manual support: real emulator token, barrier, partial deletion and resume preserve the other account', async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  assert.equal(projectId, 'demo-financas10', 'Only the disposable local project is permitted.');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8089');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9098');
  const environment = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  const admin = initializeAdmin({ projectId }, 'manual-support-test');
  const server = adminFirestore(admin), accounts = adminAuth(admin);
  const owner = 'manual-disposable-owner', other = 'manual-preserved-other';
  const clientApp = initializeApp({ projectId, apiKey: 'fake-emulator-only', appId: 'fake-local' }, 'manual-support-client');
  const login = getAuth(clientApp); connectAuthEmulator(login, 'http://127.0.0.1:9098', { disableWarnings: true });
  const client = getFirestore(clientApp); connectFirestoreEmulator(client, '127.0.0.1', 8089);
  try {
    await accounts.createUser({ uid: owner, email: 'manual-owner@example.invalid', password: 'Emulator-only-password-42', emailVerified: true });
    await accounts.createUser({ uid: other, email: 'manual-other@example.invalid' });
    await server.doc(`users/${owner}`).set({ uid: owner });
    await server.doc(`users/${other}`).set({ uid: other, retained: 'unchanged' });
    const writer = server.bulkWriter();
    for (let i = 0; i < 551; i++) writer.set(server.doc(`users/${owner}/${i < 300 ? 'expenses' : 'revenues'}/fixture-${i}`), { id: `fixture-${i}`, title: 'Fictício', value: 1, category: 'Teste', month: '2026-11', date: '2026-11-12' });
    writer.set(server.doc(`users/${owner}/expenses/fixture-0/details/nested`), { nested: true });
    await writer.close();
    const session = await signInWithEmailAndPassword(login, 'manual-owner@example.invalid', 'Emulator-only-password-42');
    const oldToken = await session.user.getIdToken();
    await assertSucceeds(getDocFromServer(doc(client, 'users', owner)));
    await assertFails(getDocFromServer(doc(client, 'users', other)));
    await assertFails(setDoc(doc(client, 'accountDeletionRequests', other), { state: 'manual-processing' }));
    await accounts.updateUser(owner, { disabled: true }); await accounts.revokeRefreshTokens(owner);
    // A previously issued token may remain usable. The rules barrier is needed immediately.
    assert.ok(await session.user.getIdToken() === oldToken);
    await server.doc(`accountDeletionRequests/${owner}`).set({ state: 'manual-processing', requestedAt: Timestamp.now() });
    await assertFails(getDocFromServer(doc(client, 'users', owner)));
    await assertFails(setDoc(doc(client, 'users', owner), { uid: owner }));
    await assertFails(setDoc(doc(client, 'users', owner, 'expenses', 'stale-write'), { id: 'stale-write', title: 'Fictício', value: 1, category: 'Teste', month: '2026-11', date: '2026-11-12' }));
    // Simulate an operator interruption after one collection: do not delete Auth or release the barrier.
    await server.recursiveDelete(server.collection(`users/${owner}/expenses`));
    assert.equal((await accounts.getUser(owner)).disabled, true);
    assert.equal((await server.collection(`users/${owner}/revenues`).get()).size, 251);
    await assertFails(setDoc(doc(client, 'users', owner), { uid: owner }));
    // Resume and verify all nested data before removing Authentication.
    await server.recursiveDelete(server.doc(`users/${owner}`));
    assert.equal((await server.doc(`users/${owner}`).get()).exists, false);
    for (const part of ['expenses', 'revenues']) assert.equal((await server.collection(`users/${owner}/${part}`).get()).size, 0);
    assert.equal((await server.doc(`users/${owner}/expenses/fixture-0/details/nested`).get()).exists, false);
    await accounts.deleteUser(owner);
    await assert.rejects(accounts.getUser(owner), error => error.code === 'auth/user-not-found');
    await assertFails(setDoc(doc(client, 'users', owner), { uid: owner }));
    assert.equal((await server.doc(`users/${other}`).get()).data().retained, 'unchanged');
    assert.equal((await accounts.getUser(other)).disabled, false);
    assert.equal((await server.doc(`accountDeletionRequests/${other}`).get()).exists, false);
    // Keep the barrier until old tokens expire; no TTL or paid service is involved.
    assert.equal((await server.doc(`accountDeletionRequests/${owner}`).get()).data().state, 'manual-processing');
  } finally { await deleteApp(clientApp); await environment.cleanup(); await admin.delete(); }
});
