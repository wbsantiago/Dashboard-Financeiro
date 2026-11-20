import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import type { usePaymentReminders } from '../hooks/usePaymentReminders';
import { useBackHandler } from '../hooks/useBackHandler';
import { getAppLockStatus } from '../utils/appLock';
import { formatDate, getLocalDateStr } from '../utils/format';
import './PaymentReminders.css';

type State = ReturnType<typeof usePaymentReminders>;
export function ReminderInbox({ reminders, onConfigure, onViewMonth, openRequest }: { reminders: State; onConfigure: () => void; onViewMonth: (month: string) => void; openRequest: number }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const unread = reminders.inbox.filter(r => !r.readAt).length;
  const today = getLocalDateStr(reminders.clock);
  useBackHandler(open, () => setOpen(false), 130);
  useEffect(() => { setOpen(false); }, [reminders.scope]);
  useEffect(() => { if (openRequest) setOpen(true); }, [openRequest]);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current, previous = document.body.style.overflow;
    element?.showModal(); heading.current?.focus(); document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previous; trigger.current?.focus({ preventScroll: true }); };
  }, [open]);
  useEffect(() => {
    if (!open || !list.current) return;
    const root = list.current;
    let active = true, checking = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function markVisible() {
      if (!active || checking || document.visibilityState !== 'visible' || !dialog.current?.open) return;
      checking = true;
      try {
        // Native protection can cover the WebView when opened from a phone notification.
        // Do not mark a notice read until the device's app lock has been unlocked.
        const protection = await getAppLockStatus();
        if (!active) return;
        if (protection.locked) { clearTimeout(retry); retry = setTimeout(() => { void markVisible(); }, 500); return; }
        const viewport = root.getBoundingClientRect();
        if (!viewport.height || document.visibilityState !== 'visible') return;
        root.querySelectorAll<HTMLElement>('article[data-unread="true"]').forEach(element => {
          const box = element.getBoundingClientRect();
          const visibleHeight = Math.min(box.bottom, viewport.bottom) - Math.max(box.top, viewport.top);
          const visibleWidth = Math.min(box.right, viewport.right) - Math.max(box.left, viewport.left);
          if (visibleHeight >= Math.min(box.height, viewport.height) * .5 && visibleWidth >= box.width * .5) {
            const id = element.dataset.receiptId;
            if (id) reminders.markRead(id);
          }
        });
      } catch { /* Leave unread if the app cannot confirm that native protection is unlocked. */ }
      finally { checking = false; }
    }
    const observer = new IntersectionObserver(() => { void markVisible(); }, { root, threshold: [0, .25, .5, .75, 1] });
    root.querySelectorAll('article[data-unread="true"]').forEach(element => observer.observe(element));
    const refresh = () => { void markVisible(); };
    root.addEventListener('scroll', refresh, { passive: true });
    document.addEventListener('visibilitychange', refresh); window.addEventListener('focus', refresh);
    void markVisible();
    return () => { active = false; clearTimeout(retry); observer.disconnect(); root.removeEventListener('scroll', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [open, reminders.inbox]);
  return <>
    <button type="button" ref={trigger} className="compact-header-button reminder-bell" aria-label={unread ? `Avisos: ${unread} não lidos` : 'Avisos'} title="Avisos" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'reminder-inbox' : undefined} onClick={() => setOpen(true)}>
      <Bell size={18} />{unread > 0 && <span className="reminder-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <dialog ref={dialog} id="reminder-inbox" className="reminder-inbox" aria-labelledby="reminder-inbox-title" onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false);
    }}>
      <div className="reminder-inbox-heading"><div><h2 id="reminder-inbox-title" ref={heading} tabIndex={-1}>Seus avisos</h2><p>{unread ? `${unread} não lido${unread > 1 ? 's' : ''}` : 'Você está em dia com a leitura'}</p></div><button type="button" aria-label="Fechar avisos" onClick={() => setOpen(false)}><X size={19} /></button></div>
      <div className="reminder-inbox-toolbar"><button type="button" disabled={!unread} onClick={() => reminders.markRead()}><CheckCheck size={16} />Marcar todos como lidos</button></div>
      <div ref={list} className="reminder-inbox-list">
        {!reminders.inbox.length && <div className="reminder-inbox-empty"><Bell size={28} /><h3>Nenhum aviso por aqui</h3><p>Os vencimentos de cartões, boletos e Pix aparecem aqui quando estiverem próximos ou em atraso. Informe as datas nos cartões e lançamentos.</p></div>}
        {reminders.inbox.map(receipt => {
          const item = reminders.allItems.find(i => i.key === receipt.key && i.dueDate === receipt.dueDate);
          if (!item && receipt.stage !== 'test') return null;
          const state = item?.paid ? 'Pago' : receipt.stage === 'test' ? 'Teste' : receipt.dueDate < today ? 'Em atraso' : receipt.dueDate === today ? 'Vence hoje' : 'Próximo vencimento';
          return <article key={receipt.id} className="reminder-inbox-item" data-receipt-id={receipt.id} data-unread={!receipt.readAt}>
            <div className="reminder-inbox-item-title"><strong>{item?.title ?? 'Teste de notificação'}</strong><span>{state}</span></div>
            <p>{item ? `${item.kind === 'card' ? 'Fatura' : item.kind === 'boleto' ? 'Boleto' : 'Pix'} com vencimento em ${formatDate(item.dueDate)}.${item.paid ? ' O pagamento foi marcado no aplicativo.' : ' Confira o pagamento nos seus lançamentos.'}` : 'O envio de um aviso de teste ao Android foi solicitado.'}</p>
            <small>Adicionado em {new Date(receipt.firstSeenAt).toLocaleDateString('pt-BR')}</small>
            <div className="reminder-inbox-item-actions">{item && <button type="button" onClick={() => { reminders.markRead(receipt.id); setOpen(false); onViewMonth(item.month); }}>Ver lançamentos</button>}</div>
          </article>;
        })}
      </div>
      <footer><p>Avisos do aplicativo. A entrega pelo Android depende da permissão e das configurações do celular.</p><button type="button" onClick={() => { setOpen(false); onConfigure(); }}>Configurar lembretes</button></footer>
    </dialog>}
  </>;
}
