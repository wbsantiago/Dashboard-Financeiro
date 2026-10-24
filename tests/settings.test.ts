import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { INITIAL_MOCK_DATA } from '../src/utils/storage';

// Exercise the real reset handler with isolated storage, including while a cloud view is open.
const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleRealClearData' && node.initializer) {
    handler = node.initializer.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler);
const javascript = ts.transpileModule(`(${handler})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

for (const mode of ['local', 'cloud']) {
  test(`${mode}: clearing the local financial copy preserves preferences, session and cloud data`, () => {
    const preferences = new Map([['app-theme', 'light'], ['privacy-mode', 'true'], ['storage-type', mode], ['auth-session', 'active']]);
    const before = new Map(preferences);
    const cloudData = { expenses: [{ id: 'remote-record' }], creditCards: [{ id: 'remote-card' }] };
    let displayed: unknown = cloudData;
    let saved: any;
    let modalOpen = true;
    vm.runInNewContext(javascript, {
      storageType: mode, demoMode: false, structuredClone, INITIAL_MOCK_DATA,
      localStorage: { clear: () => { preferences.clear(); } },
      saveAppData: (value: unknown) => { saved = value; },
      setData: (value: unknown) => { displayed = value; },
      setShowDeleteConfirm: (value: boolean) => { modalOpen = value; },
      triggerNotification: () => {},
    });
    assert.deepEqual(preferences, before);
    assert.deepEqual(saved.expenses, []);
    assert.deepEqual(saved.revenues, []);
    assert.deepEqual(saved.creditCards, []);
    assert.deepEqual(saved.monthlyBudgets, []);
    assert.equal(modalOpen, false);
    assert.equal(displayed, mode === 'cloud' ? cloudData : saved);
    assert.deepEqual(cloudData.expenses, [{ id: 'remote-record' }]);
  });
}

test('demo: resetting examples never saves or deletes the real local copy', () => {
  let displayed: any;
  vm.runInNewContext(javascript, {
    storageType: 'local', demoMode: true, structuredClone, INITIAL_MOCK_DATA,
    saveAppData: () => { throw new Error('Demo must not save local data'); },
    setData: (value: unknown) => { displayed = value; },
    setShowDeleteConfirm: () => {}, triggerNotification: () => {},
  });
  assert.deepEqual(displayed.expenses, []);
});
