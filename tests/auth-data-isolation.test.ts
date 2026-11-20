import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { INITIAL_MOCK_DATA } from '../src/utils/storage';
import { CloudReadState } from '../src/utils/cloudState';

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const effects: string[] = [];
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect') effects.push(node.arguments[0].getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
function effectContaining(text: string, context: object) {
  const effect = effects.find(value => value.includes(text));
  assert.ok(effect, text);
  const js = ts.transpileModule(`(${effect})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(js, context)();
}

test('account changes reset the displayed copy, logout restores local records, and neither uploads financial data', () => {
  const local = { ...structuredClone(INITIAL_MOCK_DATA), expenses: [{ id: 'local-only' }] };
  let currentData: any = local, listener: any, mode = '', currentUser: any;
  const sessionUid = { current: null };
  const context = { demoMode: false, isFirebaseConfigured: true, auth: { onAuthStateChanged(callback: any) { listener = callback; return () => {}; } }, db: {},
    sessionUid, INITIAL_MOCK_DATA, structuredClone, loadAppData: () => local,
    setData: (data: any) => { currentData = data; }, setUser: (user: any) => { currentUser = user; }, setAuthReady() {},
    setStorageType: (value: string) => { mode = value; }, writeNecessaryPreference() {}, setCloudWriteReady() {}, setCloudState() {},
  };
  effectContaining('auth.onAuthStateChanged', context);
  listener({ uid: 'existing-account' });
  assert.equal(mode, 'cloud'); assert.equal(currentUser.uid, 'existing-account');
  assert.deepEqual(currentData.expenses, []); assert.deepEqual(local.expenses, [{ id: 'local-only' }]);
  currentData.expenses = [{ id: 'account-A-private' }];
  listener({ uid: 'other-account' });
  assert.deepEqual(currentData.expenses, []);
  listener(null);
  assert.equal(mode, 'local'); assert.equal(currentData, local); assert.equal(sessionUid.current, null);
});

test('sign-in reads existing cloud data; missing cache never initializes a profile and stale account callbacks are ignored', async () => {
  let data = structuredClone(INITIAL_MOCK_DATA), writes = 0, transactions = 0;
  const callbacks: Record<string, any> = {}, unsubscribed: string[] = [];
  const auth = { currentUser: { uid: 'existing-account' } as any };
  const context = { demoMode: false, storageType: 'cloud', user: { uid: 'existing-account' }, db: {}, auth, INITIAL_MOCK_DATA,
    CloudReadState, isAccountDeletionPending: () => false, readNecessaryPreference: () => '', writeNecessaryPreference() {}, setCloudWriteReady() {}, setCloudState() {},
    doc: (_db: unknown, ...parts: string[]) => parts.join('/'), collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
    onSnapshot: (path: string, ...args: any[]) => { callbacks[path] = args.find(arg => typeof arg === 'function'); return () => unsubscribed.push(path); },
    setData: (update: any) => { data = update(data); }, loadAppData: () => { throw new Error('must not load local into cloud'); },
    createProfile: async (_db: unknown, action: any) => { transactions++; await action({ get: async () => ({ exists: () => true }), set: () => { writes++; } }); },
    handleFirestoreError() {}, OperationType: { GET: 'get', LIST: 'list' }, console,
  };
  const cleanup = effectContaining('const unsubProfile = onSnapshot', context);
  const profile = callbacks['users/existing-account'];
  profile({ metadata: { fromCache: true }, exists: () => false });
  assert.equal(transactions, 0);
  profile({ metadata: { fromCache: false }, exists: () => true, data: () => ({ defaultMonthlySalary: 4321 }) });
  assert.equal(data.defaultMonthlySalary, 4321); assert.equal(writes, 0);
  profile({ metadata: { fromCache: false }, exists: () => false });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(transactions, 1); assert.equal(writes, 0, 'transaction must recheck an existing profile');
  const expenses = callbacks['users/existing-account/expenses'];
  expenses({ forEach: (visit: any) => visit({ id: 'cloud-record', data: () => ({ title: 'Existing cloud', createdAt: 1 }) }) });
  assert.equal(data.expenses[0].id, 'cloud-record');
  auth.currentUser = { uid: 'other-account' };
  expenses({ forEach() { throw new Error('old account snapshot must not be read'); } });
  assert.equal(data.expenses[0].id, 'cloud-record');
  cleanup(); assert.equal(unsubscribed.length, 3);
  auth.currentUser = { uid: 'existing-account' };
  expenses({ forEach() { throw new Error('unsubscribed snapshot must not be read'); } });
});
