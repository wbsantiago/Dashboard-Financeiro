import type { AppData, CreditCard, Expense } from '../types';
import { shiftMonthlyDate } from './recurrence';

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validDay(day: unknown): day is number { return typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 31; }
export function primaryCard(data: Pick<AppData, 'creditCards' | 'primaryCardId'>) {
  return data.creditCards?.find(card => card.id === data.primaryCardId && validDay(card.closingDay));
}
export function cycleConfiguration(data: AppData) {
  const card = primaryCard(data);
  // Existing entries retain their stored month. Only navigation and new/edited dates use this rule.
  return { budgets: card ? [] : data.monthlyBudgets, closingDay: card?.closingDay ?? data.defaultCardClosingDay ?? 5 };
}
export function dayInMonth(month: string, day: number) {
  const [year, number] = month.split('-').map(Number);
  const last = new Date(year, number, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}
export function cardForExpense(expense: Expense, cards: CreditCard[]) {
  // IDs are authoritative. A deleted card must never be silently reassigned by matching digits.
  if (expense.cardId) return cards.find(card => card.id === expense.cardId);
  const matches = cards.filter(card => card.lastDigits === expense.cardLastDigits);
  return matches.length === 1 ? matches[0] : undefined;
}
export function invoiceDueDate(expense: Expense, card: CreditCard): string | null {
  if (!validDate(expense.date) || !validDay(card.closingDay) || !validDay(card.dueDay)) return null;
  let closingMonth = expense.date.slice(0, 7);
  if (Number(expense.date.slice(8)) > Number(dayInMonth(closingMonth, card.closingDay).slice(8))) {
    closingMonth = shiftMonthlyDate(`${closingMonth}-01`, 1).slice(0, 7);
  }
  // A due day on/before closing belongs to the following calendar month.
  const dueMonth = card.dueDay <= card.closingDay ? shiftMonthlyDate(`${closingMonth}-01`, 1).slice(0, 7) : closingMonth;
  return dayInMonth(dueMonth, card.dueDay);
}
export function shiftedDueDate(dueDate: string | null | undefined, months: number) {
  return dueDate ? shiftMonthlyDate(dueDate, months) : dueDate;
}
