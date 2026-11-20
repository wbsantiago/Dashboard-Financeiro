import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { deletionIdentity, processDeletion } from './deletion.mjs';

initializeApp();
const db = getFirestore(), auth = getAuth();
const region = 'southamerica-east1';
const jobRef = uid => db.doc(`accountDeletionRequests/${uid}`);

export const requestAccountDeletion = onCall({ region, maxInstances: 3, timeoutSeconds: 30 }, async request => {
  let uid;
  try { uid = deletionIdentity(request.auth); }
  catch (error) {
    throw new HttpsError(error.message === 'unauthenticated' ? 'unauthenticated' : 'failed-precondition', 'Confirme novamente a conta Google para solicitar a exclusão.');
  }
  // The server first persists acceptance. Closing the app cannot cancel the job.
  await db.runTransaction(async transaction => {
    const ref = jobRef(uid), existing = await transaction.get(ref);
    if (!existing.exists) transaction.create(ref, { state: 'requested', requestedAt: FieldValue.serverTimestamp(), attempts: 0 });
  });
  return { accepted: true };
});

async function ignoreMissing(operation) {
  try { await operation(); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
}

export const deleteRequestedAccount = onDocumentCreated({
  document: 'accountDeletionRequests/{uid}', region, retry: true,
  maxInstances: 2, concurrency: 1, timeoutSeconds: 540, memory: '512MiB',
}, event => processDeletion(event.params.uid, {
  readJob: async uid => (await jobRef(uid).get()).data(),
  processing: uid => jobRef(uid).update({ state: 'processing', attempts: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }),
  disableAccount: uid => ignoreMissing(async () => { await auth.updateUser(uid, { disabled: true }); await auth.revokeRefreshTokens(uid); }),
  deleteFinancialTree: uid => db.recursiveDelete(db.doc(`users/${uid}`)),
  deleteAuthAccount: uid => ignoreMissing(() => auth.deleteUser(uid)),
  completed: uid => jobRef(uid).update({ state: 'completed', completedAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000) }),
  retryPending: uid => jobRef(uid).update({ state: 'retry-pending', updatedAt: FieldValue.serverTimestamp() }),
}));
