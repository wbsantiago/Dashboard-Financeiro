import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut, reauthenticateWithCredential, reauthenticateWithPopup, type Auth } from 'firebase/auth';
import { isNativeApp } from './platform';

function cancelled(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code || '');
  const message = String((error as { message?: unknown })?.message || '');
  return ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', '12501', 'SIGN_IN_CANCELLED'].includes(code)
    || /cancelled|canceled|user cancelled|activity is canceled/i.test(message);
}

export async function connectGoogle(auth: Auth) {
  try {
    if (!isNativeApp) return await signInWithPopup(auth, new GoogleAuthProvider());
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true, useCredentialManager: true });
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error('Google não retornou a credencial necessária.');
    // Only Firebase's SDK owns session persistence. Never save tokens in app storage.
    return await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  } catch (error) {
    if (cancelled(error)) return null;
    throw new Error('Não foi possível conectar com Google. Confira a conexão e tente novamente.');
  }
}

export async function disconnectGoogle(auth: Auth) {
  // End the Firebase/Firestore session even if provider cleanup fails.
  await signOut(auth);
  if (isNativeApp) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch { /* No native Firebase session is created (skipNativeAuth). */ }
  }
}

export async function confirmGoogleIdentity(auth: Auth): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new Error('Entre na conta que deseja excluir.');
  try {
    if (!isNativeApp) await reauthenticateWithPopup(user, new GoogleAuthProvider());
    else {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true, useCredentialManager: true });
      if (!result.credential?.idToken) throw new Error('missing-credential');
      await reauthenticateWithCredential(user, GoogleAuthProvider.credential(result.credential.idToken));
    }
    if (auth.currentUser?.uid !== user.uid) throw new Error('account-changed');
    await user.getIdToken(true);
    return true;
  } catch (error) {
    if (cancelled(error)) return false;
    throw new Error('Confirme a mesma conta Google que deseja excluir. Nenhum pedido foi enviado.');
  }
}
