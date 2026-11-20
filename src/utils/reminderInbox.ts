import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { PaymentReminder } from './reminders';
import { getLocalDateStr } from './format';

// Only references and read/seen dates are persisted. Titles and financial amounts stay in the planning source.
export interface ReminderReceipt { id: string; key: string; dueDate: string; firstSeenAt: number; readAt?: number; stage: 'before' | 'due' | 'test' }
export function parseInbox(json: string | null): ReminderReceipt[] {
  try {
    const value = JSON.parse(json ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(r => r && typeof r.id === 'string' && r.id.length <= 400 && typeof r.key === 'string' && r.key.length <= 300
      && typeof r.dueDate === 'string' && Number.isFinite(r.firstSeenAt) && r.firstSeenAt > 0
      && (r.readAt === undefined || Number.isFinite(r.readAt)) && ['before', 'due', 'test'].includes(r.stage)).slice(0, 80);
  } catch { return []; }
}
export function refreshInbox(previous: ReminderReceipt[], all: PaymentReminder[], daysBefore: number, now = new Date()) {
  const today = getLocalDateStr(now), cutoff = now.getTime() - 90 * 86400000;
  const sources = new Map(all.map(item => [item.key, item]));
  const kept = previous.filter(r => r.firstSeenAt >= cutoff && (r.stage === 'test' || sources.get(r.key)?.dueDate === r.dueDate));
  const ids = new Set(kept.map(r => r.id));
  for (const item of all) {
    if (item.paid) continue;
    const [year, month, day] = item.dueDate.split('-').map(Number);
    const before = getLocalDateStr(new Date(year, month - 1, day - daysBefore));
    if (today < before) continue;
    const stage = today < item.dueDate ? 'before' : 'due';
    const id = `${item.key}|${item.dueDate}|${stage}`;
    if (ids.has(id)) continue;
    kept.push({ id, key: item.key, dueDate: item.dueDate, stage, firstSeenAt: now.getTime() }); ids.add(id);
  }
  return kept.sort((a, b) => b.firstSeenAt - a.firstSeenAt || b.id.localeCompare(a.id)).slice(0, 80);
}
export async function loadInbox(scope: string) {
  const key = `payment-reminder-inbox:${scope}`;
  if (Capacitor.isNativePlatform()) return parseInbox((await Preferences.get({ key })).value);
  return parseInbox(localStorage.getItem(key));
}
// Serial persistence prevents an older render/save from restoring unread flags after marking as read.
let queue: Promise<unknown> = Promise.resolve();
export function saveInbox(scope: string, receipts: ReminderReceipt[]) {
  const key = `payment-reminder-inbox:${scope}`, value = JSON.stringify(receipts);
  const job = queue.catch(() => {}).then(async () => {
    if (Capacitor.isNativePlatform()) await Preferences.set({ key, value });
    else localStorage.setItem(key, value);
  });
  queue = job;
  return job;
}
