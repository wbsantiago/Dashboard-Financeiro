import { getFunctions, httpsCallable } from 'firebase/functions';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { ACCOUNT_SERVICES } from '../config/accountServices';
import { confirmGoogleIdentity, disconnectGoogle } from './authentication';
import { isNativeApp } from './platform';
import { setCloudWriteReady } from './cloudWrites';

const purgeKey = 'financas10-clear-deleted-cloud-cache';
let deletionPending = false;
export const isAccountDeletionPending = () => deletionPending;

export async function finishCloudCacheCleanup(db: Firestore | null, force = false): Promise<boolean> {
  let pending = force;
  try { pending ||= localStorage.getItem(purgeKey) === 'yes'; } catch { /* Storage may be unavailable. */ }
  if (!db || !isNativeApp || !pending) return false;
  await terminate(db);
  await clearIndexedDbPersistence(db);
  try { localStorage.removeItem(purgeKey); } catch { /* Cache is already cleared. */ }
  return true;
}

export async function requestAccountDeletion(auth: Auth, db: Firestore): Promise<'cancelled' | 'accepted'> {
  if (!ACCOUNT_SERVICES.enabled) throw new Error('A exclusão automática ainda está em preparação. Use o atendimento para solicitar a exclusão.');
  if (navigator.onLine === false) throw new Error('Conecte-se à internet para solicitar a exclusão.');
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Entre na conta que deseja excluir.');
  if (!await confirmGoogleIdentity(auth)) return 'cancelled';
  if (uid !== auth.currentUser?.uid) throw new Error('A conta mudou. Confira o perfil antes de continuar.');
  const response = await httpsCallable<undefined, { accepted: boolean }>(getFunctions(auth.app, ACCOUNT_SERVICES.region), 'requestAccountDeletion')();
  if (!response.data?.accepted) throw new Error('Não foi possível confirmar o recebimento. Confira sua conexão e tente novamente.');
  deletionPending = true;
  setCloudWriteReady(false);
  // Acceptance is durable on the server. Logout/cache cleanup errors must not imply cancellation.
  if (isNativeApp) { try { localStorage.setItem(purgeKey, 'yes'); } catch { /* Cleanup still attempted below. */ } }
  try { await disconnectGoogle(auth); } catch { /* Worker disables the account independently. */ }
  try { await finishCloudCacheCleanup(db, true); } catch { /* Next startup retries cleanup, before rendering account data. */ }
  return 'accepted';
}
