import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData } from '../types';
import { DEFAULT_REMINDERS, paymentReminders, reminderAlarms, type ReminderPreferences } from '../utils/reminders';
import { loadReminderPreferences, nativeReminders, reconcileReminderNotifications, reminderPermission, saveReminderPreferences, testReminderNotification } from '../utils/reminderNotifications';
import { loadInbox, refreshInbox, saveInbox, type ReminderReceipt } from '../utils/reminderInbox';

export function usePaymentReminders(data: AppData, scope: string, ready: boolean, demo: boolean) {
  const [preferences, setPreferences] = useState({ ...DEFAULT_REMINDERS });
  const [loadedScope, setLoadedScope] = useState('');
  const [permission, setPermission] = useState('unknown');
  const [error, setError] = useState('');
  const [inboxError, setInboxError] = useState('');
  const [receipts, setReceipts] = useState<{ scope: string; items: ReminderReceipt[] }>({ scope: '', items: [] });
  const [clock, setClock] = useState(() => new Date());
  const latestScope = useRef(scope); latestScope.current = scope;
  const items = useMemo(() => ready ? paymentReminders(data) : [], [data, ready]);
  const allItems = useMemo(() => ready ? paymentReminders(data, true) : [], [data, ready]);
  useEffect(() => {
    let active = true;
    setLoadedScope(''); setError('');
    if (demo) { setPreferences({ ...DEFAULT_REMINDERS }); setReceipts({ scope, items: [] }); setLoadedScope(scope); return; }
    void reconcileReminderNotifications([]).catch(() => { if (active) setError('Não foi possível limpar os lembretes anteriores. Reabra o aplicativo.'); });
    void Promise.all([loadReminderPreferences(scope), loadInbox(scope)]).then(([value, inbox]) => { if (active) { setPreferences(value); setReceipts({ scope, items: inbox }); setLoadedScope(scope); } }).catch(() => { if (active) setInboxError('Não foi possível ler seus avisos neste aparelho.'); });
    return () => { active = false; };
  }, [scope, demo]);
  useEffect(() => {
    if (!ready || loadedScope !== scope) return;
    setReceipts(previous => {
      if (previous.scope !== scope) return previous;
      const items = refreshInbox(previous.items, allItems, preferences.daysBefore, clock);
      return JSON.stringify(items) === JSON.stringify(previous.items) ? previous : { scope, items };
    });
  }, [allItems, loadedScope, scope, ready, preferences.daysBefore, clock]);
  useEffect(() => {
    if (demo || !ready || receipts.scope !== scope || loadedScope !== scope) return;
    let active = true;
    void saveInbox(scope, receipts.items).then(() => { if (active) setInboxError(''); }).catch(() => { if (active) setInboxError('Os avisos estão disponíveis nesta visita, mas não foi possível guardar a leitura neste aparelho.'); });
    return () => { active = false; };
  }, [receipts, scope, loadedScope, ready, demo]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setClock(new Date());
      void reminderPermission().then(value => { if (active) setPermission(value); }).catch(() => { if (active) setError('Não foi possível conferir a permissão de notificações.'); });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    let remove: (() => Promise<void>) | undefined;
    if (nativeReminders()) void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('resume', refresh);
      if (!active) await listener.remove(); else remove = () => listener.remove();
    });
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); void remove?.(); };
  }, []);
  useEffect(() => {
    if (demo) return;
    let active = true;
    const alarms = ready && loadedScope === scope && permission === 'granted' ? reminderAlarms(items, preferences, clock) : [];
    void reconcileReminderNotifications(alarms).then(() => { if (active) setError(''); }).catch(() => { if (active) setError('Não foi possível atualizar os lembretes neste aparelho. Abra o app novamente para tentar.'); });
    return () => { active = false; };
  }, [items, preferences, scope, loadedScope, ready, permission, clock, demo]);
  async function save(next: ReminderPreferences) {
    const current = scope;
    if (next.enabled && !demo) {
      const status = await reminderPermission(true);
      if (latestScope.current !== current) return;
      setPermission(status);
      if (status !== 'granted') throw new Error('Notificações não autorizadas. Permita nas configurações do Android e tente novamente.');
    }
    if (!demo) await saveReminderPreferences(current, next);
    if (latestScope.current === current) setPreferences(next);
  }
  function markRead(id?: string) {
    setReceipts(previous => previous.scope !== scope ? previous : { scope, items: previous.items.map(r => !r.readAt && (!id || r.id === id) ? { ...r, readAt: Date.now() } : r) });
  }
  async function testNotification() {
    const current = scope;
    await testReminderNotification();
    if (latestScope.current !== current) return;
    const now = Date.now();
    setReceipts(previous => previous.scope !== current ? previous : { scope: current, items: [{ id: `test:${now}`, key: '__test__', dueDate: '', stage: 'test', firstSeenAt: now }, ...previous.items].slice(0, 80) });
  }
  const inbox = ready && loadedScope === scope && receipts.scope === scope ? receipts.items : [];
  return { items, allItems, inbox, markRead, testNotification, preferences, save, permission, error: error || inboxError, clock, loaded: loadedScope === scope, supported: nativeReminders() && !demo, scope };
}
