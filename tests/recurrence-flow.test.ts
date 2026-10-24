import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createMonthlyOccurrences, readRecurrenceFields, selectRecurringItems, updateRecurringItems } from '../src/utils/recurrence';
import { getCompetenceMonth } from '../src/utils/format';
import { INITIAL_MOCK_DATA } from '../src/utils/storage';
import type { AppData } from '../src/types';

// Execute the actual App handlers with storage boundaries replaced by in-memory fakes.
const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['uploadDataToCloud', 'persistRecurringItems', 'handleAddExpense', 'handleDeleteExpense', 'handleUpdateExpense',
  'handleAddRevenue', 'handleDeleteRevenue', 'handleUpdateRevenue'];
const declarations: string[] = [];
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text) && node.initializer) {
    declarations.push(`const ${node.name.text} = ${node.initializer.getText(ast)};`);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.length, names.length);
const javascript = ts.transpileModule(`(() => { ${declarations.join('\n')} return { ${names.join(',')} }; })()`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function setup(mode: 'local' | 'cloud', initial: AppData = structuredClone(INITIAL_MOCK_DATA)) {
  const commits: { type: string; path: string; data?: any }[][] = [];
  let failWrite = false;
  const context: any = {
    data: initial, storageType: mode, auth: { currentUser: { uid: 'test-user' } }, db: {},
    createMonthlyOccurrences, readRecurrenceFields, selectRecurringItems, updateRecurringItems, getCompetenceMonth,
    cleanDocument: (data: any) => JSON.parse(JSON.stringify(data)),
    OperationType: { WRITE: 'write', UPDATE: 'update', DELETE: 'delete' },
    handleFirestoreError: (error: unknown) => { throw error; }, triggerNotification: () => {},
    doc: (_: unknown, ...parts: string[]) => parts.join('/'),
    setData: (updater: (data: AppData) => AppData) => { context.data = updater(context.data); },
    setDoc: async () => {},
    writeBatch: () => {
      const pending: { type: string; path: string; data?: any }[] = [];
      return {
        set: (path: string, data: any) => pending.push({ type: 'set', path, data }),
        delete: (path: string) => pending.push({ type: 'delete', path }),
        commit: async () => {
          if (failWrite) throw new Error('simulated cloud failure');
          commits.push(pending);
          for (const item of pending) {
            const parts = item.path.split('/');
            assert.equal(parts[1], 'test-user');
            const key = parts[2] as 'expenses' | 'revenues';
            assert.ok(key === 'expenses' || key === 'revenues');
            const remaining = (context.data[key] || []).filter((entry: any) => entry.id !== parts[3]);
            context.data = { ...context.data, [key]: item.type === 'delete' ? remaining : [...remaining, item.data] };
          }
        },
      };
    },
  };
  const handlers = vm.runInNewContext(javascript, context);
  return { context, handlers, commits, fail: () => { failWrite = true; } };
}

const expense = { title: 'Barbeiro', value: 80, category: 'Cuidados Pessoais', date: '2026-01-15',
  month: '2026-01', isInstallment: false, recurrenceMonths: 6 };
const revenue = { title: 'Vale-alimentação', value: 800, category: 'VA', date: '2026-01-10',
  month: '2026-01', recurrenceMonths: 6 };

for (const mode of ['local', 'cloud'] as const) {
  test(`${mode}: expense creation, future edit and deletion preserve past months and other series`, async () => {
    const h = setup(mode);
    await h.handlers.handleAddExpense(expense);
    const first = [...h.context.data.expenses].sort((a, b) => a.recurrenceIndex - b.recurrenceIndex);
    await h.handlers.handleAddExpense(expense);
    assert.equal(h.context.data.expenses.length, 12);
    assert.ok(h.context.data.expenses.every((entry: any) => entry.paid === false && entry.value === 80));
    await h.handlers.handleUpdateExpense(first[2].id, { value: 100, date: first[2].date }, 'future');
    assert.equal(h.context.data.expenses.find((entry: any) => entry.id === first[0].id).value, 80);
    assert.equal(h.context.data.expenses.filter((entry: any) => entry.value === 100).length, 4);
    await h.handlers.handleDeleteExpense(first[2].id, 'future');
    assert.equal(h.context.data.expenses.length, 8);
    assert.ok(h.context.data.expenses.some((entry: any) => entry.id === first[0].id));
    assert.ok(h.context.data.expenses.some((entry: any) => entry.id === first[1].id));
    assert.equal(h.commits.length, mode === 'cloud' ? 4 : 0);
  });

  test(`${mode}: revenues repeat in full and support single/future operations`, async () => {
    const h = setup(mode);
    await h.handlers.handleAddRevenue(revenue);
    const entries = [...h.context.data.revenues].sort((a, b) => a.recurrenceIndex - b.recurrenceIndex);
    assert.equal(entries.reduce((sum: number, entry: any) => sum + entry.value, 0), 4800);
    await h.handlers.handleUpdateRevenue(entries[1].id, { value: 900 }, 'single');
    assert.equal(h.context.data.revenues.filter((entry: any) => entry.value === 900).length, 1);
    await h.handlers.handleDeleteRevenue(entries[2].id, 'future');
    assert.equal(h.context.data.revenues.length, 2);
    assert.equal(h.context.data.revenues.find((entry: any) => entry.id === entries[0].id).value, 800);
  });

  test(`${mode}: single recurrence deletion leaves the rest of the series intact`, async () => {
    const h = setup(mode);
    await h.handlers.handleAddExpense(expense);
    const pivot = h.context.data.expenses[2];
    await h.handlers.handleDeleteExpense(pivot.id, 'single');
    assert.equal(h.context.data.expenses.length, 5);
    assert.ok(h.context.data.expenses.every((entry: any) => entry.id !== pivot.id));
  });
}

test('invalid or simultaneous recurrence/installment requests create no records', async () => {
  const h = setup('cloud');
  await assert.rejects(() => h.handlers.handleAddExpense({ ...expense, isInstallment: true }));
  await assert.rejects(() => h.handlers.handleAddExpense({ ...expense, recurrenceMonths: 121 }));
  await assert.rejects(() => h.handlers.handleAddRevenue({ ...revenue, recurrenceMonths: 0 }));
  assert.equal(h.commits.length, 0);
  assert.equal(h.context.data.expenses.length, 0);
});

test('cloud failures do not fall back to local writes or partially create a series', async () => {
  const h = setup('cloud');
  h.fail();
  await assert.rejects(() => h.handlers.handleAddExpense(expense));
  assert.equal(h.commits.length, 0);
  assert.equal(h.context.data.expenses.length, 0);
  h.context.auth.currentUser = null;
  await assert.rejects(() => h.handlers.handleAddRevenue(revenue));
  assert.equal(h.context.data.revenues.length, 0);
});

test('legacy installments remain separate from recurrence in local mode', async () => {
  const h = setup('local');
  await h.handlers.handleAddExpense({ ...expense, recurrenceMonths: undefined, isInstallment: true,
    totalInstallments: 3, currentInstallment: 1 });
  assert.equal(h.context.data.expenses.length, 3);
  assert.ok(h.context.data.expenses.every((entry: any) => entry.isInstallment && !entry.recurrenceId));
});

test('manual cloud upload preserves recurrence metadata from local data and backups', async () => {
  const h = setup('cloud');
  const expenses = createMonthlyOccurrences(expense, 3, 'exp');
  const revenues = createMonthlyOccurrences(revenue, 3, 'rev');
  await h.handlers.uploadDataToCloud('test-user', { ...INITIAL_MOCK_DATA, expenses, revenues }, 'done');
  assert.deepEqual(h.context.data.expenses.map(readRecurrenceFields), expenses.map(readRecurrenceFields));
  assert.deepEqual(h.context.data.revenues.map(readRecurrenceFields), revenues.map(readRecurrenceFields));
});

test('the maximum duration fits into a single cloud batch for creation and deletion', async () => {
  const h = setup('cloud');
  await h.handlers.handleAddExpense({ ...expense, recurrenceMonths: 120 });
  assert.equal(h.commits.length, 1);
  assert.equal(h.commits[0].length, 120);
  const first = h.context.data.expenses.find((entry: any) => entry.recurrenceIndex === 1);
  await h.handlers.handleDeleteExpense(first.id, 'future');
  assert.equal(h.commits.length, 2);
  assert.equal(h.context.data.expenses.length, 0);
});
