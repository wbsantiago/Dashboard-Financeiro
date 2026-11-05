import type { CategoryBudget, Expense } from '../types';
import { CATEGORY_COLORS, DEFAULT_CATEGORIES } from './storage';

export function isCustomExpenseCategory(category: string): boolean {
  return !DEFAULT_CATEGORIES.includes(category);
}

export function isArchivedExpenseCategory(budgets: CategoryBudget[], category: string): boolean {
  return isCustomExpenseCategory(category) && budgets.some(b => b.category === category && b.archived === true);
}

export function getExpenseCategories(budgets: CategoryBudget[], expenses: Expense[], editingCategory?: string): string[] {
  return [...new Set([...DEFAULT_CATEGORIES, ...budgets.map(b => b.category), ...expenses.map(e => e.category)])]
    .filter(category => category === editingCategory || !isArchivedExpenseCategory(budgets, category));
}

/** Include historical/new expense categories without silently writing to a user's profile. */
export function mergeCategoryBudgets(budgets: CategoryBudget[], expenses: Expense[]): CategoryBudget[] {
  const categories = new Map(budgets.map(budget => [budget.category, { ...budget }]));
  for (const expense of expenses) {
    if (!categories.has(expense.category)) categories.set(expense.category, { category: expense.category, idealLimit: 0 });
  }
  return [...categories.values()];
}

export function categoryBudgetUsage(spent: number, limit: number) {
  const percentage = limit > 0 ? spent / limit * 100 : null;
  const exceeded = limit > 0 ? spent > limit : spent > 0;
  return {
    percentage,
    fillPercentage: percentage === null ? (exceeded ? 100 : null) : Math.min(100, Math.max(0, percentage)),
    exceeded,
    severe: percentage !== null && percentage >= 200,
  };
}

/** Give custom categories a stable, vivid color across every view. */
export function getCategoryColor(category: string): string {
  if (Object.hasOwn(CATEGORY_COLORS, category)) return CATEGORY_COLORS[category];
  const palette = ['#398bff', '#fb4e63', '#16c784', '#ad63ff', '#ffb020', '#00bfdd', '#f54da2', '#00bfa5'];
  let hash = 0;
  for (const character of category) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) | 0;
  return palette[(hash >>> 0) % palette.length];
}
