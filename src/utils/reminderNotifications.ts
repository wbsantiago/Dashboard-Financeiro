import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { DEFAULT_REMINDERS, reminderPreferences, type ReminderAlarm, type ReminderPreferences } from './reminders';

export const nativeReminders = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
const channelId = 'financas10-vencimentos-v1';
const marker = 'financas10PaymentReminder';
export async function loadReminderPreferences(scope: string) {
  if (!nativeReminders()) return { ...DEFAULT_REMINDERS };
  const { value } = await Preferences.get({ key: `payment-reminders-v1:${scope}` });
  try { return reminderPreferences(value ? JSON.parse(value) : null); } catch { return { ...DEFAULT_REMINDERS }; }
}
export async function saveReminderPreferences(scope: string, value: ReminderPreferences) {
  if (nativeReminders()) await Preferences.set({ key: `payment-reminders-v1:${scope}`, value: JSON.stringify(reminderPreferences(value)) });
}
export async function reminderPermission(request = false) {
  if (!nativeReminders()) return 'unsupported';
  return (await (request ? LocalNotifications.requestPermissions() : LocalNotifications.checkPermissions())).display;
}
function notification(alarm: ReminderAlarm): LocalNotificationSchema {
  return { id: alarm.id, title: 'Mês de Boa · Lembrete de pagamento', body: 'Confira seus vencimentos e pagamentos pendentes no aplicativo.',
    schedule: { at: alarm.at }, isExactNotification: false, channelId, smallIcon: 'ic_stat_reminder',
    extra: { [marker]: true, at: alarm.at.getTime() } };
}
// Serializes mutations and discards outdated requests, including account switches.
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();
export function reconcileReminderNotifications(alarms: ReminderAlarm[]) {
  const request = ++generation;
  const job = queue.catch(() => {}).then(async () => {
    if (!nativeReminders() || request !== generation) return;
    const pending = (await LocalNotifications.getPending()).notifications.filter(n => n.extra?.[marker] && n.id !== 169999999);
    if (request !== generation) return;
    const wanted = new Map(alarms.map(alarm => [alarm.id, alarm]));
    const obsolete = pending.filter(n => !wanted.has(n.id) || n.extra.at !== wanted.get(n.id)!.at.getTime());
    if (obsolete.length) await LocalNotifications.cancel({ notifications: obsolete.map(n => ({ id: n.id })) });
    // Remove already delivered generic alerts when clearing/switching the current planning source.
    if (!alarms.length) {
      const delivered = (await LocalNotifications.getDeliveredNotifications()).notifications.filter(n => n.extra?.[marker]);
      if (delivered.length) await LocalNotifications.removeDeliveredNotifications({ notifications: delivered });
    }
    if (request !== generation || !alarms.length || await reminderPermission() !== 'granted') return;
    await LocalNotifications.createChannel({ id: channelId, name: 'Vencimentos', description: 'Lembretes de cartões, boletos e Pix pendentes', importance: 3, visibility: 0 });
    if (request !== generation) return;
    const added = alarms.filter(a => a.at.getTime() > Date.now() && !pending.some(n => n.id === a.id && n.extra.at === a.at.getTime()));
    if (added.length) await LocalNotifications.schedule({ notifications: added.map(notification) });
    // A newer request queued during schedule will reconcile and cancel stale alarms before adding its own.
  });
  queue = job;
  return job;
}
export async function testReminderNotification() {
  if (await reminderPermission(true) !== 'granted') throw new Error('Permita as notificações nas configurações do Android para receber o teste.');
  await LocalNotifications.createChannel({ id: channelId, name: 'Vencimentos', importance: 3, visibility: 0 });
  // A test should post immediately, without waiting for the OS inexact-alarm batching window.
  const test = notification({ id: 169999999, at: new Date() });
  delete test.schedule;
  await LocalNotifications.schedule({ notifications: [test] });
}
