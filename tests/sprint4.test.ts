import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NativeLocalStore } from '../src/utils/nativePersistence';
import { createBackup } from '../src/utils/backupFiles';
import { INITIAL_MOCK_DATA, importDataFromJSON, loadAppData } from '../src/utils/storage';
import { CloudReadState } from '../src/utils/cloudState';

const fixture = () => ({ ...structuredClone(INITIAL_MOCK_DATA), expenses: [{ id: 'local-1', title: 'Teste persistente', value: 27, category: 'Pet', month: '2026-11', date: '2026-11-11', createdAt: 1, isInstallment: false }], categoryBudgets: [{ category: 'Pet', idealLimit: 0, archived: true }], defaultTargetSavingsPercentage: 0 });
function memory() { const values = new Map<string,string>(); return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; }
function driver(initial: string | null = null) { let snapshot = initial, fail = false; const writes: string[] = []; return { writes, get snapshot() { return snapshot; }, setFail(value: boolean) { fail = value; }, readSnapshot: async () => ({ snapshot }), writeSnapshot: async (value: { snapshot: string }) => { if (fail) throw new Error('disk full'); snapshot = value.snapshot; writes.push(snapshot); } }; }

test('native upgrade migrates legacy local records without resetting custom categories, zero settings, session or cookies', async () => {
  const web = memory(), data = fixture(), disk = driver(); web.setItem('controle_financeiro_data', JSON.stringify(data)); web.setItem('firebase-session', 'untouched'); web.setItem('financas10-cookie-choice', 'untouched');
  const store = new NativeLocalStore(disk, web, importDataFromJSON); await store.initialize();
  assert.equal(store.current!.data.expenses[0].id, 'local-1'); assert.equal(store.current!.data.categoryBudgets[0].archived, true);
  assert.equal(store.current!.data.defaultTargetSavingsPercentage, 0); assert.equal(disk.writes.length, 1);
  assert.equal(web.getItem('firebase-session'), 'untouched'); assert.equal(web.getItem('financas10-cookie-choice'), 'untouched');
  const restarted = new NativeLocalStore(disk, memory(), importDataFromJSON); await restarted.initialize();
  assert.equal(restarted.current!.data.expenses[0].title, 'Teste persistente');
});
test('restart selects the newest valid atomic snapshot and repairs its older mirror', async () => {
  for (const nativeNewer of [true, false]) {
    const a = fixture(), b = fixture(); b.expenses[0].value = 99;
    const disk = driver(JSON.stringify({ version: 1, revision: nativeNewer ? 20 : 10, data: a })), web = memory();
    web.setItem('controle_financeiro_snapshot_v1', JSON.stringify({ version: 1, revision: nativeNewer ? 10 : 20, data: b }));
    const store = new NativeLocalStore(disk, web, importDataFromJSON); await store.initialize();
    assert.equal(store.current!.data.expenses[0].value, nativeNewer ? 27 : 99);
    assert.equal(JSON.parse(disk.snapshot!).revision, 20);
  }
});
test('rapid local saves preserve order; clearing the local copy clears its native mirror without touching preferences', async () => {
  const disk = driver(), web = memory(), store = new NativeLocalStore(disk, web, importDataFromJSON); await store.initialize();
  web.setItem('privacy-mode', 'true'); const a = fixture(), b = fixture(); b.expenses[0].value = 88;
  store.save(a); store.save(b); a.expenses[0].value = 900; await store.flush();
  assert.equal(JSON.parse(disk.snapshot!).data.expenses[0].value, 88);
  store.save(structuredClone(INITIAL_MOCK_DATA)); await store.flush();
  assert.deepEqual(JSON.parse(disk.snapshot!).data.expenses, []); assert.equal(web.getItem('privacy-mode'), 'true');
});
test('failed restoration preserves the previous copy; failed background save reports error and recovers from the web mirror', async () => {
  const disk = driver(), web = memory(); let errors = 0;
  const store = new NativeLocalStore(disk, web, importDataFromJSON, () => { errors++; }); await store.initialize(); await store.restore(fixture());
  const original = disk.snapshot, replacement = fixture(); replacement.expenses[0].value = 123;
  disk.setFail(true); await assert.rejects(store.restore(replacement));
  assert.equal(disk.snapshot, original); assert.equal(store.current!.data.expenses[0].value, 27);
  store.save(replacement); await assert.rejects(store.flush()); assert.equal(errors, 1);
  disk.setFail(false); const restarted = new NativeLocalStore(disk, web, importDataFromJSON); await restarted.initialize();
  assert.equal(restarted.current!.data.expenses[0].value, 123);
});
test('a valid WebView copy remains accessible for backup when native migration cannot write to disk', async () => {
  const disk = driver(), web = memory(); let warnings = 0;
  disk.setFail(true); web.setItem('controle_financeiro_data', JSON.stringify(fixture()));
  const store = new NativeLocalStore(disk, web, importDataFromJSON, () => { warnings++; });
  await store.initialize();
  assert.equal(store.current!.data.expenses[0].value, 27); assert.equal(store.hasSaveError, true); assert.equal(warnings, 1);
  await assert.rejects(store.flush()); assert.equal(JSON.parse(web.getItem('controle_financeiro_data')!).expenses[0].id, 'local-1');
});
test('unreadable copies never become an empty successful restore or overwrite the original files', async () => {
  const disk = driver('{corrupt'), web = memory(); web.setItem('controle_financeiro_data', '{also corrupt');
  await assert.rejects(new NativeLocalStore(disk, web, importDataFromJSON).initialize(), /recuperar/);
  assert.equal(disk.snapshot, '{corrupt'); assert.equal(disk.writes.length, 0); assert.equal(web.getItem('controle_financeiro_data'), '{also corrupt');
});
test('an explicit validated restore can recover unreadable copies without automatically resetting them', async () => {
  const disk = driver('{corrupt'), web = memory(); web.setItem('controle_financeiro_data', '{broken');
  const store = new NativeLocalStore(disk, web, importDataFromJSON);
  await assert.rejects(store.initialize()); assert.equal(disk.writes.length, 0);
  await store.restore(fixture());
  const restarted = new NativeLocalStore(disk, web, importDataFromJSON); await restarted.initialize();
  assert.equal(restarted.current!.data.expenses[0].value, 27);
});
test('a save made while restoration is in flight keeps its newer revision and survives restart', async () => {
  const disk = driver(), web = memory(), store = new NativeLocalStore(disk, web, importDataFromJSON);
  await store.initialize(); await store.restore(fixture());
  const a = fixture(), b = fixture(); a.expenses[0].value = 33; b.expenses[0].value = 44;
  const restoring = store.restore(a); store.save(b); await restoring; await store.flush();
  assert.equal(store.current!.data.expenses[0].value, 44);
  const restarted = new NativeLocalStore(disk, web, importDataFromJSON); await restarted.initialize();
  assert.equal(restarted.current!.data.expenses[0].value, 44);
});
test('new and legacy backups round-trip all supported data, preserving zero values and installment flags', () => {
  const data = fixture(); Object.assign(data.expenses[0], { isInstallment: true, totalInstallments: 3, currentInstallment: 1, firstInstallmentInNextMonth: true });
  const exported = createBackup(data); const restored = importDataFromJSON(exported.json);
  assert.equal(restored.expenses[0].firstInstallmentInNextMonth, true); assert.equal(restored.defaultMonthlySalary, 0); assert.equal(restored.defaultTargetSavingsPercentage, 0);
  assert.deepEqual(restored, importDataFromJSON(JSON.stringify(data)));
  assert.deepEqual(Object.keys(JSON.parse(exported.json)).sort(), ['backupVersion','data','exportedAt']);
});
test('a null amount is rejected and a zero timestamp remains zero on backup restoration', () => {
  const data = fixture(); data.expenses[0].createdAt = 0;
  assert.equal(importDataFromJSON(createBackup(data).json).expenses[0].createdAt, 0);
  assert.throws(() => importDataFromJSON(JSON.stringify({ ...data, expenses: [{ ...data.expenses[0], value: null }] })), /inválido/);
});
test('invalid files, dates, amounts, duplicate IDs, future backup versions and excessive size are rejected before restoration', () => {
  for (const invalid of ['{broken', JSON.stringify({ backupVersion: 99, data: fixture() }), JSON.stringify({ ...fixture(), expenses: [null] }), JSON.stringify({ ...fixture(), expenses: [{ ...fixture().expenses[0], value: 'NaN' }] }), JSON.stringify({ ...fixture(), expenses: [{ ...fixture().expenses[0], date: '2026-02-31' }] }), JSON.stringify({ ...fixture(), expenses: [fixture().expenses[0], fixture().expenses[0]] }), ' '.repeat(10 * 1024 * 1024 + 1)]) assert.throws(() => importDataFromJSON(invalid));
});
test('legacy categories without Presentes preserve financial history on load', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), web = memory(); web.setItem('controle_financeiro_data', JSON.stringify(fixture()));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: web });
  try { assert.equal(loadAppData().expenses[0].id, 'local-1'); }
  finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
test('cloud cache becomes available only after a complete server load, preserving pending and reconnect status', () => {
  const state = new CloudReadState();
  assert.equal(state.observe('profile', { fromCache: true, hasPendingWrites: false }, false).available, false);
  state.observe('profile', { fromCache: false, hasPendingWrites: false }, true);
  state.observe('expenses', { fromCache: false, hasPendingWrites: false });
  assert.equal(state.observe('revenues', { fromCache: false, hasPendingWrites: false }).confirmed, true);
  assert.equal(state.observe('expenses', { fromCache: true, hasPendingWrites: true }).pending, true);
  assert.equal(state.observe('revenues', { fromCache: true, hasPendingWrites: false }).available, true);
  const accountB = new CloudReadState(); accountB.observe('profile', { fromCache: true, hasPendingWrites: false }, true); accountB.observe('expenses', { fromCache: true, hasPendingWrites: false });
  assert.equal(accountB.observe('revenues', { fromCache: true, hasPendingWrites: false }).available, false);
});
test('restored native cloud cache is readable offline; an absent cached profile remains unavailable', () => {
  const state = new CloudReadState(true); state.observe('expenses', { fromCache: true, hasPendingWrites: false }); state.observe('revenues', { fromCache: true, hasPendingWrites: false });
  assert.equal(state.observe('profile', { fromCache: true, hasPendingWrites: false }, true).available, true);
  assert.equal(state.observe('profile', { fromCache: true, hasPendingWrites: false }, false).available, false);
});

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let confirm = '';
function visit(node: ts.Node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleConfirmImport') confirm = node.initializer!.getText(ast); ts.forEachChild(node, visit); } visit(ast);
const js = ts.transpileModule(`(${confirm})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
test('confirming a backup while signed in changes only the separate local copy and never calls Firestore', async () => {
  for (const mode of ['local','cloud']) {
    let displayed: unknown = 'current-cloud', stored: unknown, closed = false;
    const restore = vm.runInNewContext(js, { pendingImport: { data: fixture() }, demoMode: false, storageType: mode,
      restoreAppData: async (value: unknown) => { stored = value; }, setData: (value: unknown) => { displayed = value; }, setPendingImport: () => { closed = true; }, setLocalSaveError() {}, triggerNotification() {},
      uploadDataToCloud: () => { throw new Error('restoration must not touch cloud'); },
    });
    await restore(); assert.ok(stored); assert.equal(closed, true); assert.equal(mode === 'cloud' ? displayed : 'current-cloud', 'current-cloud');
  }
});

test('cloud writes fail immediately while offline or loading, and reconnect restores writing without replaying a custom queue', async () => {
  const code = ts.transpileModule(fs.readFileSync(new URL('../src/utils/cloudWrites.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: any = {}; let writes = 0; const connection = { onLine: true };
  vm.runInNewContext(code, { exports, navigator: connection, require: () => ({ setDoc: async () => { writes++; }, deleteDoc: async () => { writes++; }, runTransaction: async () => { writes++; }, writeBatch: () => ({ commit: async () => { writes++; } }) }) });
  exports.setCloudConnection(false);
  await assert.rejects(exports.setDoc(), /Sem internet/); await assert.rejects(exports.deleteDoc(), /Sem internet/); await assert.rejects(exports.writeBatch().commit(), /Sem internet/); assert.equal(writes, 0);
  exports.setCloudConnection(true); exports.setCloudWriteReady(false); await assert.rejects(exports.setDoc(), /carregamento/); assert.equal(writes, 0);
  exports.setCloudWriteReady(true); await exports.setDoc(); assert.equal(writes, 1);
  connection.onLine = false; exports.setCloudConnection(true, true); await exports.setDoc(); assert.equal(writes, 2);
  exports.setCloudConnection(false, true); await assert.rejects(exports.setDoc(), /Sem internet/); assert.equal(writes, 2);
});
