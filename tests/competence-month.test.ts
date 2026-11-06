import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { getCompetenceMonth } from '../src/utils/format';
import { INITIAL_MOCK_DATA } from '../src/utils/storage';
import type { AppData, MonthlyBudget } from '../src/types';

const budget = (month: string, cardClosingDay: number): MonthlyBudget => ({ month, cardClosingDay, salary: 3000, targetSavingsPercentage: 10 });
const hookSource = fs.readFileSync(new URL('../src/hooks/useCompetenceMonth.ts', import.meta.url), 'utf8');
const hookJs = ts.transpileModule(hookSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

// Run the real hook with a controlled clock and React state/effect lifecycle.
function monthView(initialDate: string, fixedMonth?: string) {
  let now = new Date(initialDate), cursor = 0, mounted = false;
  const states: any[] = [], effects: (() => void | (() => void))[] = [], cleanups: (() => void)[] = [];
  const listeners = new Map<string, () => void>();
  let interval: (() => void) | undefined;
  class ClockDate extends Date { constructor() { super(now.getTime()); } }
  const exports: any = {};
  vm.runInNewContext(hookJs, {
    exports, Date: ClockDate,
    require: (name: string) => name === 'react' ? {
      useState: (initial: any) => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], (value: any) => { states[index] = value; }];
      },
      useEffect: (effect: () => void | (() => void)) => { if (!mounted) effects.push(effect); },
    } : { getCompetenceMonth },
    window: {
      setInterval: (callback: () => void, delay: number) => { assert.equal(delay, 60_000); interval = callback; return 1; },
      clearInterval: () => { interval = undefined; },
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    document: {
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback),
      removeEventListener: (name: string) => listeners.delete(name),
    },
  });
  return {
    render(budgets: MonthlyBudget[] = [], closing = 5): readonly [string, (month: string) => void] {
      cursor = 0;
      const result = exports.useCompetenceMonth(budgets, closing, fixedMonth);
      if (!mounted) { effects.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }); mounted = true; }
      return result;
    },
    advance(date: string, event = 'interval') { now = new Date(date); if (event === 'interval') interval?.(); else listeners.get(event)?.(); },
    dispose() { cleanups.forEach(cleanup => cleanup()); assert.equal(interval, undefined); assert.equal(listeners.size, 0); },
  };
}

test('header adopts closing configuration arriving after sign-in, without changing the saved budgets', () => {
  const view = monthView('2026-11-05T12:00:00');
  assert.equal(view.render()[0], '2026-10');
  const remote = [budget('2026-11', 3)];
  assert.equal(view.render(remote)[0], '2026-11');
  assert.equal(remote[0].cardClosingDay, 3);
  view.dispose();
});

for (const event of ['interval', 'focus', 'visibilitychange']) {
  test(`${event}: open dashboard rolls forward after the closing day, including year boundaries`, () => {
    const view = monthView('2026-11-03T23:59:59');
    assert.equal(view.render([], 3)[0], '2026-10');
    view.advance('2026-11-04T00:00:00', event);
    assert.equal(view.render([], 3)[0], '2026-11');
    view.advance('2027-01-03T12:00:00', event);
    assert.equal(view.render([], 3)[0], '2026-12');
    view.advance('2027-01-04T00:00:00', event);
    assert.equal(view.render([], 3)[0], '2027-01');
    view.dispose();
  });
}

test('manual history browsing survives clock/config updates; returning to the current month resumes automatic selection', () => {
  const view = monthView('2026-11-05T12:00:00');
  view.render([], 3)[1]('2026-09');
  assert.equal(view.render([], 3)[0], '2026-09');
  view.advance('2026-12-06T12:00:00');
  assert.equal(view.render([budget('2026-12', 4)], 3)[0], '2026-09');
  view.render([], 3)[1]('2026-12');
  view.advance('2027-01-04T12:00:00');
  assert.equal(view.render([], 3)[0], '2027-01');
  view.dispose();
});

test('zero closing follows calendar months; demo remains fixed without a clock listener', () => {
  const view = monthView('2026-11-01T00:00:00');
  assert.equal(view.render([], 0)[0], '2026-11');
  view.dispose();
  const demo = monthView('2026-11-05T12:00:00', '2026-10');
  assert.equal(demo.render([], 3)[0], '2026-10');
  demo.advance('2027-01-10T12:00:00');
  assert.equal(demo.render([], 3)[0], '2026-10');
  demo.render()[1]('2026-11');
  assert.equal(demo.render()[0], '2026-11');
  demo.dispose();
});

const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleSaveMonthConfig' && node.initializer) handler = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler);
const saveJs = ts.transpileModule(`(${handler})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

for (const mode of ['local', 'cloud'] as const) {
  test(`${mode}: saving closing day persists the new default and preserves other months and financial records`, async () => {
    const data = structuredClone(INITIAL_MOCK_DATA);
    data.monthlyBudgets = [budget('2026-10', 5), budget('2026-12', 7)];
    let displayed = data, payload: any, closed = false;
    const context = { data, storageType: mode, auth: { currentUser: { uid: 'owner' } }, db: {}, selectedMonth: '2026-10', salaryInput: '3000', savingsInput: 10, cardClosingDayInput: 3,
      setData: (update: (prev: AppData) => AppData) => { displayed = update(displayed); },
      doc: (_db: unknown, ...parts: string[]) => parts.join('/'), cleanDocument: (value: unknown) => value,
      setDoc: async (path: string, value: any, options: any) => { assert.equal(path, 'users/owner'); assert.equal(options.merge, true); payload = value; },
      closeSettings: () => { closed = true; }, triggerNotification: () => {}, formatMonthName: (value: string) => value,
    };
    await vm.runInNewContext(saveJs, context)({ preventDefault() {} });
    const saved = mode === 'cloud' ? payload : displayed;
    assert.equal(saved.defaultCardClosingDay, 3);
    assert.equal(saved.monthlyBudgets.find((b: MonthlyBudget) => b.month === '2026-10').cardClosingDay, 3);
    assert.equal(saved.monthlyBudgets.find((b: MonthlyBudget) => b.month === '2026-12').cardClosingDay, 7);
    assert.equal(getCompetenceMonth('2026-11-05', saved.monthlyBudgets, saved.defaultCardClosingDay), '2026-11');
    assert.equal(displayed.expenses, data.expenses);
    assert.equal(displayed.revenues, data.revenues);
    assert.equal(displayed.creditCards, data.creditCards);
    if (mode === 'cloud') assert.deepEqual(Object.keys(payload).sort(), ['defaultCardClosingDay', 'defaultMonthlySalary', 'defaultTargetSavingsPercentage', 'monthlyBudgets', 'uid']);
    assert.equal(closed, true);
  });
}
