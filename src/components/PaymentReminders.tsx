import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import type { usePaymentReminders } from '../hooks/usePaymentReminders';
import { formatCurrency, formatDate, getLocalDateStr } from '../utils/format';
import { PrivateValue } from './PrivateValue';
import './PaymentReminders.css';

type State = ReturnType<typeof usePaymentReminders>;
export function ReminderSettings({ reminders, demo }: { reminders: State; demo: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function action(fn: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await fn(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Não foi possível alterar os lembretes.'); }
    finally { setBusy(false); }
  }
  return <div className="payment-reminder-settings">
    <p className="settings-description">Vencimentos de cartões e contas por boleto ou Pix que ainda não foram marcados como pagos. Cadastre as datas em Orçamento do mês e nos lançamentos.</p>
    <label className="settings-check"><div><h4>Notificações neste Android</h4><p>{demo ? 'A demonstração não agenda notificações reais.' : reminders.supported ? 'Receba um aviso discreto, sem nomes de contas ou valores. Você autoriza o envio no Android ao ativar.' : 'Disponível no aplicativo Android instalado. No navegador, consulte a área de vencimentos do painel.'}</p></div>
      <input type="checkbox" aria-label="Ativar lembretes de vencimento" disabled={busy || !reminders.loaded || !reminders.supported} checked={reminders.preferences.enabled} onChange={e => { const enabled = e.target.checked; void action(() => reminders.save({ ...reminders.preferences, enabled })); }} /></label>
    <div className="payment-form-grid">
      <label>Avisar antes<select disabled={busy || !reminders.loaded || !reminders.supported} value={reminders.preferences.daysBefore} onChange={e => { const daysBefore = Number(e.target.value); void action(() => reminders.save({ ...reminders.preferences, daysBefore })); }}>{[0, 1, 3, 7].map(n => <option key={n} value={n}>{n === 0 ? 'Somente no vencimento' : `${n} dia${n > 1 ? 's' : ''} antes e no vencimento`}</option>)}</select></label>
      <label>Horário aproximado<input type="time" disabled={busy || !reminders.loaded || !reminders.supported} value={reminders.preferences.time} onChange={e => { const time = e.target.value; if (time) void action(() => reminders.save({ ...reminders.preferences, time })); }} /></label>
    </div>
    {reminders.supported && <div className="settings-action"><div><h4>Conferir no celular</h4><p>Envia somente uma notificação de teste, sem alterar seus lançamentos.</p></div><button type="button" className="settings-secondary" disabled={busy} onClick={() => void action(async () => { await reminders.testNotification(); setMessage('Teste enviado ao Android e registrado no sino. Confira a barra de notificações.'); })}>Testar notificação</button></div>}
    {(message || reminders.error) && <p role="status" className="settings-description">{message || reminders.error}</p>}
    {reminders.supported && reminders.permission === 'denied' && <p className="settings-error">Notificações bloqueadas. Permita em Configurações do Android → Aplicativos → Finanças10 → Notificações.</p>}
    <p className="settings-description">Os alertas usam os dados carregados neste aparelho e são atualizados ao abrir o app ou alterar o planejamento. Marcar como pago, excluir ou alterar um vencimento atualiza os próximos avisos. Mudanças feitas em outro aparelho precisam sincronizar aqui. São preparados até 90 dias de alertas, renovados ao abrir o app.</p>
    <p className="settings-description">O Android pode atrasar os avisos por economia de bateria, aparelho desligado ou restrições do sistema. Não há confirmação bancária automática de pagamento; mantenha as pendências atualizadas.</p>
  </div>;
}
export function PaymentReminders({ reminders, onConfigure, onViewMonth }: { reminders: State; onConfigure: () => void; onViewMonth: (month: string) => void }) {
  const today = getLocalDateStr(reminders.clock);
  const upcoming = new Date(reminders.clock); upcoming.setDate(upcoming.getDate() + 30);
  const items = reminders.items.filter(item => item.dueDate <= getLocalDateStr(upcoming));
  const overdue = items.filter(item => item.dueDate < today).length;
  return <details className="payment-reminders-panel">
    <summary><Bell size={17} /><strong>Vencimentos e pendências</strong><span>{overdue ? `${overdue} em atraso` : items.length ? `${items.length} nos próximos 30 dias` : 'Sem vencimentos próximos'}</span></summary>
    <div className="payment-reminders-body"><div className="payment-reminders-toolbar"><p>Contas pendentes de todos os meses e próximas faturas.</p><button type="button" className="sereno-link" onClick={onConfigure}>Configurar lembretes</button></div>
      {!items.length && <p>Cadastre o vencimento do boleto ou Pix; nos cartões, informe fechamento e vencimento. Contas antigas sem essas datas continuam preservadas.</p>}
      <ul>{items.map(item => <li key={item.key}><div><strong>{item.title}</strong><small>{item.kind === 'card' ? `${item.count} lançamento(s) pendente(s)` : item.kind === 'boleto' ? 'Boleto' : 'Pix'} · {item.dueDate < today ? 'Em atraso' : item.dueDate === today ? 'Vence hoje' : 'Vence'} {formatDate(item.dueDate)}</small></div><div className="payment-reminder-value"><PrivateValue>{formatCurrency(item.value)}</PrivateValue><button type="button" className="sereno-link" onClick={() => onViewMonth(item.month)}>Ver lançamentos</button></div></li>)}</ul>
    </div>
  </details>;
}
