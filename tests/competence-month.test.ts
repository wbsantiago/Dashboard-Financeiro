import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { getCompetenceMonth, getClosingDayForMonth, getClosingConfigurationMonth } from '../src/utils/format';
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
    render(budgets: MonthlyBudget[] = [], closing = 5): readonly [string, (month: string) => void, { currentMonth: string; calendarMonth: string; followCurrentMonth: () => void }] {
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
    const context = { data, storageType: mode, auth: { currentUser: { uid: 'owner' } }, db: {}, selectedMonth: '2026-10', closingConfigurationMonth: '2026-11', monthNavigation: { calendarMonth: '2026-11', followCurrentMonth() {} }, getClosingDayForMonth, salaryInput: '3000', savingsInput: 10, cardClosingDayInput: 3,
      setData: (update: (prev: AppData) => AppData) => { displayed = update(displayed); },
      doc: (_db: unknown, ...parts: string[]) => parts.join('/'), cleanDocument: (value: unknown) => value,
      setDoc: async (path: string, value: any, options: any) => { assert.equal(path, 'users/owner'); assert.equal(options.merge, true); payload = value; },
      closeSettings: () => { closed = true; }, triggerNotification: () => {}, formatMonthName: (value: string) => value,
    };
    await vm.runInNewContext(saveJs, context)({ preventDefault() {} });
    const saved = mode === 'cloud' ? payload : displayed;
    assert.equal(saved.defaultCardClosingDay, 3);
    assert.equal(saved.monthlyBudgets.find((b: MonthlyBudget) => b.month === '2026-10').cardClosingDay, 5);
    assert.equal(saved.monthlyBudgets.find((b: MonthlyBudget) => b.month === '2026-11').cardClosingDay, 3);
    assert.equal(saved.monthlyBudgets.find((b: MonthlyBudget) => b.month === '2026-12').cardClosingDay, 7);
    assert.equal(getCompetenceMonth('2026-11-05', saved.monthlyBudgets, saved.defaultCardClosingDay), '2026-11');
    assert.equal(displayed.expenses, data.expenses);
    assert.equal(displayed.revenues, data.revenues);
    assert.equal(displayed.creditCards, data.creditCards);
    if (mode === 'cloud') assert.deepEqual(Object.keys(payload).sort(), ['defaultCardClosingDay', 'defaultMonthlySalary', 'defaultTargetSavingsPercentage', 'monthlyBudgets', 'uid']);
    assert.equal(closed, true);
  });
}

test('closing editor follows the calendar cycle before/after rollover and keeps other months separate', () => {
  assert.equal(getClosingConfigurationMonth('2026-10', '2026-10', '2026-11'), '2026-11');
  assert.equal(getClosingConfigurationMonth('2026-11', '2026-10', '2026-11'), '2026-11');
  assert.equal(getClosingConfigurationMonth('2026-11', '2026-11', '2026-11'), '2026-11');
  assert.equal(getClosingConfigurationMonth('2026-09', '2026-10', '2026-11'), '2026-09');
  assert.equal(getClosingConfigurationMonth('2026-12', '2026-10', '2026-11'), '2026-12');
  assert.equal(getClosingConfigurationMonth('2026-12', '2026-12', '2027-01'), '2027-01');
});

for (const mode of ['local', 'cloud'] as const) {
  test(`${mode}: changing day 3 to 6 then back to 3 follows November → October → November without losing history`, async () => {
    let data = structuredClone(INITIAL_MOCK_DATA);
    data.defaultCardClosingDay = 3;
    data.monthlyBudgets = [budget('2026-10', 3), { ...budget('2026-11', 3), salary: 5000, targetSavingsPercentage: 40 }, budget('2026-12', 7)];
    const view = monthView('2026-11-05T12:00:00');
    const originals = { expenses: data.expenses, revenues: data.revenues, cards: data.creditCards };
    for (const day of [6, 3, 6, 0, 3]) {
      const [selectedMonth, , navigation] = view.render(data.monthlyBudgets, data.defaultCardClosingDay);
      const closingConfigurationMonth = getClosingConfigurationMonth(selectedMonth, navigation.currentMonth, navigation.calendarMonth);
      assert.equal(closingConfigurationMonth, '2026-11');
      let remote: any;
      const selected = data.monthlyBudgets.find(b => b.month === selectedMonth)!;
      const context = { data, selectedMonth, closingConfigurationMonth, monthNavigation: navigation, getClosingDayForMonth,
        storageType: mode, auth: { currentUser: { uid: 'owner' } }, db: {}, salaryInput: String(selected.salary), savingsInput: selected.targetSavingsPercentage, cardClosingDayInput: day,
        setData: (update: (prev: AppData) => AppData) => { data = update(data); },
        doc: () => 'users/owner', cleanDocument: (value: unknown) => value,
        setDoc: async (_path: string, payload: any) => { remote = payload; },
        closeSettings() {}, triggerNotification() {}, formatMonthName: (value: string) => value,
      };
      await vm.runInNewContext(saveJs, context)({ preventDefault() {} });
      if (mode === 'cloud') data = { ...data, ...remote }; // Profile arrives after the write.
      const expected = day === 6 ? '2026-10' : '2026-11';
      assert.equal(view.render(data.monthlyBudgets, data.defaultCardClosingDay)[0], expected);
      assert.equal(data.monthlyBudgets.find(b => b.month === '2026-11')!.cardClosingDay, day);
      assert.equal(data.monthlyBudgets.find(b => b.month === '2026-11')!.salary, 5000);
      assert.equal(data.monthlyBudgets.find(b => b.month === '2026-11')!.targetSavingsPercentage, 40);
      assert.equal(data.monthlyBudgets.find(b => b.month === '2026-10')!.cardClosingDay, 3);
      assert.equal(data.monthlyBudgets.find(b => b.month === '2026-12')!.cardClosingDay, 7);
      assert.equal(data.expenses, originals.expenses);
      assert.equal(data.revenues, originals.revenues);
      assert.equal(data.creditCards, originals.cards);
    }
    view.dispose();
  });
}

test('editing a historical closing preserves the current default and manual history selection', async () => {
  let data = structuredClone(INITIAL_MOCK_DATA);
  data.defaultCardClosingDay = 3;
  data.monthlyBudgets = [budget('2026-09', 3), budget('2026-11', 3)];
  let resumed = false;
  const context = { data, selectedMonth: '2026-09', closingConfigurationMonth: '2026-09',
    monthNavigation: { calendarMonth: '2026-11', followCurrentMonth() { resumed = true; } }, getClosingDayForMonth,
    storageType: 'local', salaryInput: '3000', savingsInput: 10, cardClosingDayInput: 8,
    setData: (update: (prev: AppData) => AppData) => { data = update(data); },
    closeSettings() {}, triggerNotification() {}, formatMonthName: (value: string) => value,
  };
  await vm.runInNewContext(saveJs, context)({ preventDefault() {} });
  assert.equal(data.monthlyBudgets.find(b => b.month === '2026-09')!.cardClosingDay, 8);
  assert.equal(data.monthlyBudgets.find(b => b.month === '2026-11')!.cardClosingDay, 3);
  assert.equal(data.defaultCardClosingDay, 3);
  assert.equal(resumed, false);
});

test('an explicit cycle change resumes automatic selection after manual navigation to the calendar month', async () => {
  let data = structuredClone(INITIAL_MOCK_DATA);
  data.defaultCardClosingDay = 6;
  data.monthlyBudgets = [budget('2026-10', 3), budget('2026-11', 6)];
  const view = monthView('2026-11-05T12:00:00');
  view.render(data.monthlyBudgets, 6)[1]('2026-11');
  const [selectedMonth, , navigation] = view.render(data.monthlyBudgets, 6);
  const context = { data, selectedMonth, closingConfigurationMonth: '2026-11', monthNavigation: navigation, getClosingDayForMonth,
    storageType: 'local', salaryInput: '3000', savingsInput: 10, cardClosingDayInput: 3,
    setData: (update: (prev: AppData) => AppData) => { data = update(data); },
    closeSettings() {}, triggerNotification() {}, formatMonthName: (value: string) => value,
  };
  await vm.runInNewContext(saveJs, context)({ preventDefault() {} });
  assert.equal(view.render(data.monthlyBudgets, data.defaultCardClosingDay)[0], '2026-11');
  view.advance('2026-12-04T12:00:00');
  assert.equal(view.render(data.monthlyBudgets, data.defaultCardClosingDay)[0], '2026-12');
  view.dispose();
});
