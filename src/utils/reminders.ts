import type { AppData } from '../types';
import { cardForExpense, invoiceDueDate, validDate } from './paymentDates';
import { getLocalDateStr } from './format';

export interface PaymentReminder { key: string; title: string; dueDate: string; value: number; kind: 'card' | 'boleto' | 'pix'; month: string; count: number; paid?: boolean }
export interface ReminderPreferences { enabled: boolean; daysBefore: number; time: string }
export const DEFAULT_REMINDERS: ReminderPreferences = { enabled: false, daysBefore: 1, time: '09:00' };
export function reminderPreferences(value: unknown): ReminderPreferences {
  const p = value as Partial<ReminderPreferences> | null;
  return { enabled: p?.enabled === true, daysBefore: [0, 1, 3, 7].includes(p?.daysBefore as number) ? p!.daysBefore! : 1,
    time: typeof p?.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) ? p.time : '09:00' };
}
export function paymentReminders(data: AppData, includePaid = false): PaymentReminder[] {
  const items = new Map<string, PaymentReminder>();
  for (const exp of data.expenses) {
    if ((!includePaid && exp.paid) || !Number.isFinite(exp.value) || exp.value <= 0) continue;
    const cardPayment = exp.paymentMethod === 'card' || (!exp.paymentMethod && !!exp.cardLastDigits);
    const card = cardPayment ? cardForExpense(exp, data.creditCards ?? []) : undefined;
    const dueDate = cardPayment ? card && invoiceDueDate(exp, card) : exp.dueDate;
    if (!validDate(dueDate) || (!cardPayment && exp.paymentMethod !== 'boleto' && exp.paymentMethod !== 'pix')) continue;
    const key = cardPayment ? `card:${card!.id}:${dueDate}` : `expense:${exp.id}`;
    const existing = items.get(key);
    if (existing) { existing.value += exp.value; existing.count++; existing.paid = existing.paid === true && exp.paid === true; }
    else items.set(key, { key, title: cardPayment ? `Fatura ${card!.name}` : exp.title, dueDate, value: exp.value,
      kind: cardPayment ? 'card' : exp.paymentMethod as 'boleto' | 'pix', month: exp.month, count: 1, paid: exp.paid === true });
  }
  return [...items.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key));
}
export interface ReminderAlarm { id: number; at: Date }
export function reminderAlarms(items: PaymentReminder[], preferences: ReminderPreferences, now = new Date()): ReminderAlarm[] {
  if (!preferences.enabled) return [];
  const until = new Date(now); until.setDate(until.getDate() + 90);
  const [hour, minute] = preferences.time.split(':').map(Number);
  const alarms = new Map<string, ReminderAlarm>();
  for (const item of items) for (const offset of new Set([0, preferences.daysBefore])) {
    const [year, month, day] = item.dueDate.split('-').map(Number);
    const at = new Date(year, month - 1, day - offset, hour, minute);
    // Keep today's already scheduled alarm desired even when Android delivers it late.
    // Reconciliation never creates a new alarm in the past.
    if (getLocalDateStr(at) < getLocalDateStr(now) || at > until) continue;
    const key = getLocalDateStr(at);
    // One discreet summary per day; stable IDs avoid repeating a delivered morning alert on reopen.
    alarms.set(key, { id: 170000000 + Number(key.replaceAll('-', '')), at });
  }
  return [...alarms.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}
