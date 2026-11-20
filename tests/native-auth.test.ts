import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { getLocalDateStr } from '../src/utils/format';

const source = fs.readFileSync(new URL('../src/utils/authentication.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function setup(native: boolean, options: { nativeError?: unknown; missingToken?: boolean; signOutError?: boolean; popupError?: unknown; reauthError?: unknown } = {}) {
  const calls: string[] = [], exports: any = {}, auth = { currentUser: null };
  class Provider { static credential(token: string) { assert.equal(token, 'ephemeral-test-token'); return 'google-credential'; } }
  const user = { uid: 'same-existing-web-uid', getIdToken: async (refresh: boolean) => { assert.equal(refresh, true); calls.push('refresh-token'); } };
  const modules: Record<string, any> = {
    './platform': { isNativeApp: native },
    'firebase/auth': {
      GoogleAuthProvider: Provider,
      signInWithPopup: async (a: unknown, provider: unknown) => { assert.equal(a, auth); assert.ok(provider instanceof Provider); calls.push('popup'); if (options.popupError) throw options.popupError; return { user }; },
      signInWithCredential: async (a: unknown, credential: unknown) => { assert.equal(a, auth); assert.equal(credential, 'google-credential'); calls.push('firebase-credential'); return { user }; },
      signOut: async (a: unknown) => { assert.equal(a, auth); calls.push('firebase-signout'); },
      reauthenticateWithCredential: async (u: unknown, credential: unknown) => { assert.equal(u, user); assert.equal(credential, 'google-credential'); calls.push('reauth-credential'); if (options.reauthError) throw options.reauthError; },
      reauthenticateWithPopup: async (u: unknown) => { assert.equal(u, user); calls.push('reauth-popup'); if (options.popupError) throw options.popupError; },
    },
    '@capacitor-firebase/authentication': { FirebaseAuthentication: {
      signInWithGoogle: async (config: any) => { calls.push('native-google'); assert.equal(config.skipNativeAuth, true); assert.equal(config.useCredentialManager, true); if (options.nativeError) throw options.nativeError; return { credential: options.missingToken ? null : { idToken: 'ephemeral-test-token' } }; },
      signOut: async () => { calls.push('native-signout'); if (options.signOutError) throw new Error('provider cleanup unavailable'); },
    } },
  };
  vm.runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return { api: exports, calls, auth, user };
}

test('Android exchanges its Google token with the existing Firebase JS Auth, preserving the web UID', async () => {
  const { api, calls, auth, user } = setup(true);
  assert.equal((await api.connectGoogle(auth)).user, user);
  assert.deepEqual(calls, ['native-google', 'firebase-credential']);
});
test('web sign-in keeps the existing popup flow without invoking a native plugin', async () => {
  const { api, calls, auth, user } = setup(false);
  assert.equal((await api.connectGoogle(auth)).user, user);
  await api.disconnectGoogle(auth);
  assert.deepEqual(calls, ['popup', 'firebase-signout']);
});
test('cancelled account selection is quiet and creates no Firebase session', async () => {
  for (const nativeError of [{ code: '12501' }, { message: 'activity is canceled by the user.' }]) {
    const { api, calls, auth } = setup(true, { nativeError });
    assert.equal(await api.connectGoogle(auth), null);
    assert.deepEqual(calls, ['native-google']);
  }
  const web = setup(false, { popupError: { code: 'auth/popup-closed-by-user' } });
  assert.equal(await web.api.connectGoogle(web.auth), null);
});
test('missing credentials and failed native sign-in never sign into Firebase or disclose raw errors', async () => {
  for (const options of [{ missingToken: true }, { nativeError: new Error('private-provider-details') }]) {
    const { api, calls, auth } = setup(true, options);
    await assert.rejects(api.connectGoogle(auth), /Confira a conexão/);
    assert.deepEqual(calls, ['native-google']);
  }
});
test('logout ends the Firebase session even when native cleanup fails', async () => {
  const { api, calls, auth } = setup(true, { signOutError: true });
  await api.disconnectGoogle(auth);
  assert.deepEqual(calls, ['firebase-signout', 'native-signout']);
});

test('deletion reauthenticates the existing native user without signing into another Firebase account', async () => {
  const f = setup(true); f.auth.currentUser = f.user;
  assert.equal(await f.api.confirmGoogleIdentity(f.auth), true);
  assert.deepEqual(f.calls, ['native-google', 'reauth-credential', 'refresh-token']);
});
test('deletion popup cancellation sends no credential or refreshed token', async () => {
  const f = setup(false, { popupError: { code: 'auth/popup-closed-by-user' } }); f.auth.currentUser = f.user;
  assert.equal(await f.api.confirmGoogleIdentity(f.auth), false);
  assert.deepEqual(f.calls, ['reauth-popup']);
});
test('Google user mismatch blocks deletion without replacing the Firebase session', async () => {
  const f = setup(true, { reauthError: { code: 'auth/user-mismatch' } }); f.auth.currentUser = f.user;
  await assert.rejects(f.api.confirmGoogleIdentity(f.auth), /mesma conta/);
  assert.equal(f.auth.currentUser, f.user);
  assert.deepEqual(f.calls, ['native-google', 'reauth-credential']);
});
test('new-entry defaults use the device date across UTC midnight, year boundaries and leap days', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Sao_Paulo';
  try {
    assert.equal(getLocalDateStr(new Date('2026-11-12T00:33:00Z')), '2026-11-11');
    assert.equal(getLocalDateStr(new Date('2027-01-01T01:00:00Z')), '2026-12-31');
    assert.equal(getLocalDateStr(new Date('2028-03-01T01:00:00Z')), '2028-02-29');
    assert.equal(getLocalDateStr(new Date('2026-11-12T03:00:00Z')), '2026-11-12');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
