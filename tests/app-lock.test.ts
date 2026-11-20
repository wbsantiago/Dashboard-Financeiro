import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync(new URL('../src/utils/appLock.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function fixture(native = true, fail = false) {
  const calls: string[] = [], exports: any = {};
  let saved = { supported: true, enabled: false, locked: false, deviceSecure: true, biometricAvailable: true, timeoutSeconds: 30 };
  const plugin = {
    getStatus: async () => { calls.push('status'); if (fail) throw Error('not-ready'); return { ...saved }; },
    setEnabled: async ({ enabled }: { enabled: boolean }) => { calls.push(`enabled:${enabled}`); if (fail) throw Error('cancelled'); saved = { ...saved, enabled }; return { ...saved }; },
    setTimeout: async ({ seconds }: { seconds: number }) => { calls.push(`timeout:${seconds}`); return { ...saved, timeoutSeconds: seconds }; },
    openSecuritySettings: async () => { calls.push('system-settings'); },
  };
  vm.runInNewContext(code, { exports, require: (name: string) => { assert.equal(name, '@capacitor/core'); return { Capacitor: { getPlatform: () => native ? 'android' : 'web', isNativePlatform: () => native }, registerPlugin: (name: string) => { assert.equal(name, 'AppLock'); return plugin; } }; } });
  return { api: exports, calls, saved: () => saved };
}
test('browser reports unsupported without calling native authentication or persisting an enabled flag', async () => {
  const f = fixture(false); assert.equal((await f.api.getAppLockStatus()).supported, false);
  await assert.rejects(f.api.changeAppLock(true)); assert.deepEqual(f.calls, []);
});
test('Android reads the native setting and changes it only through native authentication', async () => {
  const f = fixture(); assert.equal((await f.api.getAppLockStatus()).enabled, false);
  assert.equal((await f.api.changeAppLock(true)).enabled, true);
  assert.equal((await f.api.changeAppLock(false)).enabled, false);
  assert.deepEqual(f.calls, ['status', 'enabled:true', 'enabled:false']);
});
test('cancelled or unavailable authentication cannot be reported as an enabled setting', async () => {
  const f = fixture(true, true); await assert.rejects(f.api.changeAppLock(true)); assert.equal(f.saved().enabled, false);
  await assert.rejects(f.api.getAppLockStatus());
});
test('only supported automatic locking intervals are sent to Android', async () => {
  const f = fixture(); for (const value of [-1, 1, 999999, NaN]) await assert.rejects(f.api.changeAppLockInterval(value));
  assert.deepEqual(f.calls, []);
  for (const value of [0, 30, 60, 300]) assert.equal((await f.api.changeAppLockInterval(value)).timeoutSeconds, value);
});
