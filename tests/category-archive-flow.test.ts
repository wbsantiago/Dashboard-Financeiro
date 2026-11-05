import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { INITIAL_MOCK_DATA } from '../src/utils/storage';
import type { AppData, CategoryBudget } from '../src/types';

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleUpdateCategoryBudgets' && node.initializer) handler = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler);
const javascript = ts.transpileModule(`(${handler})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

for (const mode of ['local', 'cloud'] as const) {
  test(`${mode}: archive and restore update only categories, retaining all financial records`, async () => {
    const data = structuredClone(INITIAL_MOCK_DATA);
    data.categoryBudgets.push({ category: 'Pet', idealLimit: 120 });
    data.expenses.push({ id: 'old', title: 'Veterinário', category: 'Pet', value: 80, month: '2025-10', date: '2025-10-15', createdAt: 1, isInstallment: false, paid: true });
    let displayed = data;
    const writes: any[] = [];
    const context = { storageType: mode, auth: { currentUser: { uid: 'owner' } }, db: {},
      setData: (update: (prev: AppData) => AppData) => { displayed = update(displayed); },
      doc: (_db: unknown, ...parts: string[]) => parts.join('/'), cleanDocument: (value: unknown) => value,
      setDoc: async (path: string, payload: unknown, options: unknown) => { writes.push({ path, payload, options }); }, triggerNotification: () => {},
    };
    const save = vm.runInNewContext(javascript, context);
    const archived = data.categoryBudgets.map(b => b.category === 'Pet' ? { ...b, archived: true } : b);
    await save(archived);
    assert.equal(displayed.expenses, data.expenses);
    assert.equal(displayed.revenues, data.revenues);
    assert.equal(displayed.monthlyBudgets, data.monthlyBudgets);
    assert.equal(displayed.creditCards, data.creditCards);
    assert.equal(displayed.categoryBudgets.find(b => b.category === 'Pet')!.archived, true);
    await save(data.categoryBudgets);
    assert.equal(displayed.categoryBudgets.find(b => b.category === 'Pet')!.archived, undefined);
    assert.equal(displayed.categoryBudgets.find(b => b.category === 'Pet')!.idealLimit, 120);
    assert.equal(writes.length, mode === 'cloud' ? 2 : 0);
    for (const write of writes) {
      assert.equal(write.path, 'users/owner');
      assert.deepEqual(Object.keys(write.payload).sort(), ['categoryBudgets', 'uid']);
      assert.equal(write.options.merge, true);
    }
  });
}

test('cloud failure or expired session leaves local categories and expenses untouched', async () => {
  for (const authenticated of [true, false]) {
    const data = structuredClone(INITIAL_MOCK_DATA);
    let displayed = data, attempts = 0;
    const context = { storageType: 'cloud', auth: { currentUser: authenticated ? { uid: 'owner' } : null }, db: {},
      setData: (update: (prev: AppData) => AppData) => { displayed = update(displayed); },
      doc: (_db: unknown, ...parts: string[]) => parts.join('/'), cleanDocument: (value: unknown) => value,
      setDoc: async () => { attempts++; throw new Error('offline'); }, triggerNotification: () => {},
    };
    const save = vm.runInNewContext(javascript, context);
    await assert.rejects(save([{ category: 'Pet', idealLimit: 120, archived: true }] satisfies CategoryBudget[]));
    assert.equal(displayed, data);
    assert.equal(attempts, authenticated ? 1 : 0);
  }
});

test('a cloud save finishing after an account switch does not apply categories to the next session', async () => {
  const data = structuredClone(INITIAL_MOCK_DATA);
  let displayed = data;
  const auth = { currentUser: { uid: 'original' } };
  const context = { storageType: 'cloud', auth, db: {},
    setData: (update: (prev: AppData) => AppData) => { displayed = update(displayed); },
    doc: (_db: unknown, ...parts: string[]) => parts.join('/'), cleanDocument: (value: unknown) => value,
    setDoc: async () => { auth.currentUser = { uid: 'next-account' }; }, triggerNotification: () => {},
  };
  const save = vm.runInNewContext(javascript, context);
  await save([{ category: 'Pet', idealLimit: 120, archived: true }]);
  assert.equal(displayed, data);
});
