import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/utils/accountDeletion.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function fixture(options: { enabled?: boolean; online?: boolean; cancelled?: boolean; mismatch?: boolean; accepted?: boolean; native?: boolean; logoutFailure?: boolean; cleanupFailure?: boolean } = {}) {
  const calls: string[] = [], exports: any = {}, auth = { currentUser: { uid: 'owner' }, app: 'same-firebase' };
  const storage = new Map([['financial-data', 'preserved']]);
  const modules: Record<string, any> = {
    '../config/accountServices': { ACCOUNT_SERVICES: { enabled: options.enabled !== false, region: 'southamerica-east1' } },
    './platform': { isNativeApp: !!options.native },
    './cloudWrites': { setCloudWriteReady: (value: boolean) => { assert.equal(value, false); calls.push('block-writes'); } },
    './authentication': { confirmGoogleIdentity: async () => { calls.push('reauth'); if (options.mismatch) auth.currentUser = { uid: 'other' }; return !options.cancelled; }, disconnectGoogle: async () => { calls.push('logout'); if (options.logoutFailure) throw Error('failure'); } },
    'firebase/functions': { getFunctions: (app: string, region: string) => { assert.equal(app, auth.app); assert.equal(region, 'southamerica-east1'); return {}; }, httpsCallable: (_functions: unknown, name: string) => { assert.equal(name, 'requestAccountDeletion'); return async (data?: unknown) => { assert.equal(data, undefined); calls.push('request'); return { data: { accepted: options.accepted !== false } }; }; } },
    'firebase/firestore': { terminate: async () => { calls.push('terminate'); }, clearIndexedDbPersistence: async () => { calls.push('clear-cache'); if (options.cleanupFailure) throw Error('busy'); } },
  };
  vm.runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; }, navigator: { onLine: options.online !== false }, localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } });
  return { api: exports, calls, auth, storage };
}
for (const options of [{ enabled: false }, { online: false }]) test('disabled or offline deletion sends nothing', async () => { const f = fixture(options); await assert.rejects(f.api.requestAccountDeletion(f.auth, {})); assert.deepEqual(f.calls, []); });
test('cancelled reauthentication sends nothing and preserves local data', async () => { const f = fixture({ cancelled: true }); assert.equal(await f.api.requestAccountDeletion(f.auth, {}), 'cancelled'); assert.deepEqual(f.calls, ['reauth']); assert.equal(f.storage.get('financial-data'), 'preserved'); });
test('changed Google identity cannot target a different account', async () => { const f = fixture({ mismatch: true }); await assert.rejects(f.api.requestAccountDeletion(f.auth, {})); assert.deepEqual(f.calls, ['reauth']); });
test('server acceptance must precede logout or cache cleanup', async () => { const f = fixture({ accepted: false }); await assert.rejects(f.api.requestAccountDeletion(f.auth, {})); assert.deepEqual(f.calls, ['reauth', 'request']); assert.equal(f.api.isAccountDeletionPending(), false); });
test('accepted native request blocks writes, logs out, and clears only cloud cache', async () => { const f = fixture({ native: true }); assert.equal(await f.api.requestAccountDeletion(f.auth, {}), 'accepted'); assert.deepEqual(f.calls, ['reauth', 'request', 'block-writes', 'logout', 'terminate', 'clear-cache']); assert.equal(f.storage.get('financial-data'), 'preserved'); assert.equal(f.api.isAccountDeletionPending(), true); });
test('cleanup failure retains a retry marker without claiming request cancellation', async () => { const f = fixture({ native: true, cleanupFailure: true, logoutFailure: true }); assert.equal(await f.api.requestAccountDeletion(f.auth, {}), 'accepted'); assert.equal(f.storage.get('financas10-clear-deleted-cloud-cache'), 'yes'); assert.equal(f.storage.get('financial-data'), 'preserved'); });
test('startup without a pending deletion leaves existing cloud cache alone', async () => { const f = fixture({ native: true }); assert.equal(await f.api.finishCloudCacheCleanup({}), false); assert.deepEqual(f.calls, []); });
