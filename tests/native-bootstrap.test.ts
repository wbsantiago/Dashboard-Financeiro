import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/firebase.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

for (const mode of ['unconfigured-native', 'native', 'web']) {
  const native = mode !== 'web', disabled = mode === 'unconfigured-native';
  test(`${mode}: Firebase bootstrap uses the intended authentication and database`, () => {
    const calls: string[] = [], exports: any = {};
    const services: Record<string, unknown> = {
      'firebase/app': { getApps: () => [], getApp: () => ({}), initializeApp: () => { calls.push('app'); return {}; } },
      'firebase/auth': { getAuth: () => { calls.push('auth'); return { name: 'existing-auth' }; }, indexedDBLocalPersistence: 'indexed-db', initializeAuth: (_app: unknown, options: any) => { assert.equal(options.persistence, 'indexed-db'); calls.push('persistent-auth'); return { name: 'existing-auth' }; } },
      'firebase/firestore': {
        getFirestore: (_app: unknown, database: string) => { assert.equal(database, '(default)'); calls.push('firestore'); return { name: 'existing-database' }; },
        persistentMultipleTabManager: () => 'tabs', persistentLocalCache: (options: any) => { assert.equal(options.tabManager, 'tabs'); return 'persistent-cache'; },
        initializeFirestore: (_app: unknown, options: any, database: string) => { assert.equal(options.localCache, 'persistent-cache'); assert.equal(database, '(default)'); calls.push('firestore'); return { name: 'existing-database' }; },
      },
      '../../firebase-applet-config.json': { default: { apiKey: 'test-only', firestoreDatabaseId: 'default' } },
      './demoMode': { demoMode: false }, './platform': { nativePreviewMode: disabled, isNativeApp: native },
    };
    vm.runInNewContext(compiled, { exports, console, require: (name: string) => { assert.ok(name in services, name); return services[name]; } });
    assert.equal(exports.isFirebaseConfigured, !disabled);
    if (disabled) {
      assert.equal(exports.auth, null); assert.equal(exports.db, null); assert.deepEqual(calls, []);
    } else {
      assert.equal(exports.auth.name, 'existing-auth'); assert.equal(exports.db.name, 'existing-database'); assert.deepEqual(calls, ['app', 'firestore', native ? 'persistent-auth' : 'auth']);
    }
  });
}
