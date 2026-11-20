import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { DEFAULT_REMINDERS, reminderPreferences } from '../src/utils/reminders';
const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/utils/reminderNotifications.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function harness(native = true) {
  const preferences = new Map<string, string>(), calls: any[] = [];
  let pending: any[] = [], permission = 'granted', beforePending: (() => Promise<void>) | undefined;
  const api = {
    getPending: async () => { await beforePending?.(); return { notifications: structuredClone(pending) }; },
    cancel: async ({ notifications }: any) => { calls.push(['cancel', notifications]); pending = pending.filter(n => !notifications.some((a: any) => a.id === n.id)); },
    schedule: async ({ notifications }: any) => { calls.push(['schedule', notifications]); pending.push(...notifications); },
    createChannel: async (channel: any) => { calls.push(['channel', channel]); },
    checkPermissions: async () => ({ display: permission }), requestPermissions: async () => { calls.push(['request']); return { display: permission }; },
    getDeliveredNotifications: async () => ({ notifications: [] }), removeDeliveredNotifications: async () => {},
  };
  const exports: any = {};
  vm.runInNewContext(compiled, { exports, Date, Map, JSON, Promise, require: (name: string) => {
    if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native, getPlatform: () => native ? 'android' : 'web' } };
    if (name === '@capacitor/local-notifications') return { LocalNotifications: api };
    if (name === '@capacitor/preferences') return { Preferences: { get: async ({ key }: any) => ({ value: preferences.get(key) }), set: async ({ key, value }: any) => preferences.set(key, value) } };
    if (name === './reminders') return { DEFAULT_REMINDERS, reminderPreferences };
    throw new Error(name);
  } });
  return { service: exports, calls, preferences, pending: () => pending, permission: (v: string) => { permission = v; }, delay: (fn: () => Promise<void>) => { beforePending = fn; } };
}
const alarm = (hour = 9) => { const at = new Date(Date.now() + 3 * 86400000); at.setHours(hour, 0, 0, 0); return { id: 190261120, at }; };
test('reconciliation does not duplicate alarms; time changes replace and paid/deleted cancels', async () => {
  const h = harness(); await h.service.reconcileReminderNotifications([alarm()]); await h.service.reconcileReminderNotifications([alarm()]);
  assert.equal(h.calls.filter(c => c[0] === 'schedule').length, 1);
  await h.service.reconcileReminderNotifications([alarm(10)]);
  assert.equal(h.pending().length, 1); assert.equal(h.pending()[0].schedule.at.getHours(), 10);
  await h.service.reconcileReminderNotifications([]); assert.equal(h.pending().length, 0);
});
test('account/source change invalidates an in-flight old planning request before scheduling', async () => {
  const h = harness(); let release!: () => void, entered!: () => void;
  const started = new Promise<void>(r => { entered = r; }), waiting = new Promise<void>(r => { release = r; });
  h.delay(async () => { entered(); await waiting; });
  const old = h.service.reconcileReminderNotifications([alarm()]); await started;
  const cleared = h.service.reconcileReminderNotifications([]); release(); await Promise.all([old, cleared]);
  assert.equal(h.calls.filter(c => c[0] === 'schedule').length, 0); assert.equal(h.pending().length, 0);
});
test('permission denial never schedules or requests permission in background', async () => {
  const h = harness(); h.permission('denied'); await h.service.reconcileReminderNotifications([alarm()]); assert.deepEqual(h.calls, []);
  assert.equal(await h.service.reminderPermission(true), 'denied'); assert.equal(h.calls.filter(c => c[0] === 'request').length, 1);
});
test('notification text and metadata contain no financial details; scheduling is inexact and private', async () => {
  const h = harness(); await h.service.reconcileReminderNotifications([alarm()]); const n = h.pending()[0];
  assert.equal(n.isExactNotification, false); assert.equal(n.body, 'Confira seus vencimentos e pagamentos pendentes no aplicativo.');
  assert.deepEqual(Object.keys(n.extra).sort(), ['at', 'financas10PaymentReminder']); assert.equal(h.calls.find(c => c[0] === 'channel')[1].visibility, 0);
});
test('preferences are opt-in and isolated between local planning and Google identities', async () => {
  const h = harness(); assert.equal((await h.service.loadReminderPreferences('local')).enabled, false);
  await h.service.saveReminderPreferences('cloud:user-a', { enabled: true, daysBefore: 3, time: '08:15' });
  assert.equal((await h.service.loadReminderPreferences('cloud:user-a')).enabled, true);
  assert.equal((await h.service.loadReminderPreferences('cloud:user-b')).enabled, false); assert.equal((await h.service.loadReminderPreferences('local')).enabled, false);
});
test('web never calls native notification APIs or writes device preferences', async () => {
  const h = harness(false); await h.service.reconcileReminderNotifications([alarm()]);
  await h.service.saveReminderPreferences('local', { enabled: true, daysBefore: 1, time: '09:00' });
  assert.equal(await h.service.reminderPermission(true), 'unsupported'); assert.deepEqual(h.calls, []); assert.equal(h.preferences.size, 0);
});
test('opening after the chosen hour does not schedule an alarm in the past or replay it', async () => {
  const h = harness();
  await h.service.reconcileReminderNotifications([{ id: 1234, at: new Date(Date.now() - 60000) }]);
  assert.equal(h.calls.filter(c => c[0] === 'schedule').length, 0);
});
test('the user-triggered test posts immediately without a scheduled alarm window', async () => {
  const h = harness(); await h.service.testReminderNotification();
  assert.equal(h.pending().length, 1); assert.equal(h.pending()[0].schedule, undefined);
  assert.equal(h.pending()[0].id, 169999999);
});
