import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Expense } from '../src/types';
import { categoryBudgetUsage, getCategoryColor, mergeCategoryBudgets } from '../src/utils/categories';

const expense = (category: string, month: string): Expense => ({
  id: `${category}-${month}`, category, title: 'Despesa', month, date: `${month}-10`,
  value: 95, isInstallment: false, createdAt: 1,
});

test('new and historical expense categories join the limit catalogue without replacing saved limits', () => {
  const budgets = [{ category: 'Moradia', idealLimit: 2000 }, { category: 'Reservada', idealLimit: 0 }];
  const before = structuredClone(budgets);
  const merged = mergeCategoryBudgets(budgets, [expense('Pet', '2026-10'), expense('Pet', '2026-11'), expense('Antiga', '2025-01'), expense('Moradia', '2026-10')]);
  assert.deepEqual(merged, [...before, { category: 'Pet', idealLimit: 0 }, { category: 'Antiga', idealLimit: 0 }]);
  assert.deepEqual(budgets, before);
  merged[0].idealLimit = 123;
  assert.equal(budgets[0].idealLimit, 2000);
});

test('utilization represents each category limit, including zero, fractional and exceeded budgets', () => {
  assert.equal(categoryBudgetUsage(95, 100).fillPercentage, 95);
  assert.equal(categoryBudgetUsage(9500, 10000).fillPercentage, 95);
  assert.equal(categoryBudgetUsage(0, 100).fillPercentage, 0);
  assert.equal(categoryBudgetUsage(100, 100).exceeded, false);
  const exceeded = categoryBudgetUsage(234, 100);
  assert.equal(exceeded.percentage, 234);
  assert.equal(exceeded.fillPercentage, 100);
  assert.equal(exceeded.exceeded, true);
  assert.equal(categoryBudgetUsage(100.1, 100).exceeded, true);
  assert.equal(categoryBudgetUsage(100, 0).percentage, null);
  assert.equal(categoryBudgetUsage(0, 0).fillPercentage, null);
});

test('any positive expense exceeds a zero category ceiling without dividing by zero', () => {
  for (const spent of [0.01, 1, 95, 9500]) {
    assert.deepEqual(categoryBudgetUsage(spent, 0), { percentage: null, fillPercentage: 100, exceeded: true, severe: false });
  }
  assert.deepEqual(categoryBudgetUsage(0, 0), { percentage: null, fillPercentage: null, exceeded: false, severe: false });
  assert.deepEqual(categoryBudgetUsage(-1, 0), { percentage: null, fillPercentage: null, exceeded: false, severe: false });
  assert.deepEqual(categoryBudgetUsage(1, 2), { percentage: 50, fillPercentage: 50, exceeded: false, severe: false });
  assert.deepEqual(categoryBudgetUsage(1, 1), { percentage: 100, fillPercentage: 100, exceeded: false, severe: false });
});

test('strong warning starts at 200 percent and requires a positive ceiling', () => {
  assert.equal(categoryBudgetUsage(100, 100).severe, false);
  assert.equal(categoryBudgetUsage(199.99, 100).severe, false);
  assert.equal(categoryBudgetUsage(200, 100).severe, true);
  assert.equal(categoryBudgetUsage(234, 100).severe, true);
  assert.equal(categoryBudgetUsage(.02, .01).severe, true);
  assert.equal(categoryBudgetUsage(9500, 0).severe, false);
});

test('custom category colors are deterministic and standard category colors stay intact', () => {
  assert.equal(getCategoryColor('Moradia'), '#398bff');
  assert.equal(getCategoryColor('Pet'), getCategoryColor('Pet'));
  assert.match(getCategoryColor('Veterinário 🐕'), /^#[0-9a-f]{6}$/i);
  assert.match(getCategoryColor('constructor'), /^#[0-9a-f]{6}$/i);
});
