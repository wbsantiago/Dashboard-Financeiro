import React, { useState } from 'react';
import { CreditCard as CardIcon, Pencil, Trash2 } from 'lucide-react';
import type { CreditCard } from '../types';
import { validDay } from '../utils/paymentDates';
import './PaymentReminders.css';

interface Props { cards: CreditCard[]; primaryId?: string | null; onSave: (cards: CreditCard[], primaryId: string | null) => Promise<void> }
export function CardSettings({ cards, primaryId, onSave }: Props) {
  const [editing, setEditing] = useState<Partial<CreditCard> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(cards: CreditCard[], primary: string | null) {
    setBusy(true); setError('');
    try { await onSave(cards, primary); setEditing(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar os cartões.'); }
    finally { setBusy(false); }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name?.trim() || !/^\d{4}$/.test(editing.lastDigits ?? '') || !validDay(editing.closingDay) || !validDay(editing.dueDay)) {
      setError('Informe apelido, quatro últimos dígitos, fechamento e vencimento entre 1 e 31.'); return;
    }
    const card: CreditCard = { id: editing.id ?? `card-${crypto.randomUUID()}`, name: editing.name.trim(), lastDigits: editing.lastDigits!, closingDay: editing.closingDay, dueDay: editing.dueDay };
    void save(editing.id ? cards.map(c => c.id === card.id ? card : c) : [...cards, card], primaryId ?? null);
  }
  return <section className="payment-card-settings" aria-label="Cartões e virada do mês">
    <div className="settings-action"><div><h4>Cartões e virada do mês</h4><p>Escolha um cartão principal para orientar o mês do painel. O vencimento de cada cartão serve para os lembretes.</p></div><button type="button" className="settings-secondary" disabled={busy} onClick={() => { setError(''); setEditing({}); }}>Adicionar cartão</button></div>
    {error && <p className="settings-error" role="alert">{error}</p>}
    {!cards.length && <p className="settings-description">Nenhum cartão cadastrado. A virada continua usando a configuração atual.</p>}
    <div className="payment-card-list">{cards.map(card => <article key={card.id} className="payment-card-row">
      <div className="payment-card-identity"><CardIcon size={19} /><div><strong>{card.name}</strong><small>Final {card.lastDigits}{primaryId === card.id ? ' · Principal' : ''}</small><small>Fechamento: {card.closingDay ? `dia ${card.closingDay}` : 'não informado'} · Vencimento: {card.dueDay ? `dia ${card.dueDay}` : 'não informado'}</small></div></div>
      <div className="payment-card-actions"><button type="button" className="settings-secondary" disabled={busy} aria-pressed={primaryId === card.id} onClick={() => {
        if (!validDay(card.closingDay)) { setEditing(card); setError('Informe o fechamento para usar este cartão como principal.'); return; }
        void save(cards, primaryId === card.id ? null : card.id);
      }}>{primaryId === card.id ? 'Retirar principal' : 'Usar como principal'}</button>
        <button type="button" className="settings-icon-button" disabled={busy} aria-label={`Editar cartão ${card.name}`} onClick={() => { setError(''); setEditing(card); }}><Pencil size={17} /></button>
        <button type="button" className="settings-icon-button" disabled={busy} aria-label={`Remover cartão ${card.name}`} onClick={() => {
          if (window.confirm(`Remover ${card.name} do cadastro? Os lançamentos existentes serão mantidos. Os lembretes deste cartão deixarão de ser agendados.${primaryId === card.id ? ' A virada voltará à configuração anterior, sem cartão principal.' : ''}`)) void save(cards.filter(c => c.id !== card.id), primaryId === card.id ? null : primaryId ?? null);
        }}><Trash2 size={17} /></button></div>
    </article>)}</div>
    {editing && <form className="payment-card-editor" onSubmit={submit}>
      <h4>{editing.id ? 'Editar cartão' : 'Novo cartão'}</h4>
      <div className="payment-form-grid">
        <label>Apelido<input autoFocus required maxLength={80} value={editing.name ?? ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
        <label>Quatro últimos dígitos<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={editing.lastDigits ?? ''} onChange={e => setEditing({ ...editing, lastDigits: e.target.value.replace(/\D/g, '') })} /></label>
        <label>Dia do fechamento<input required type="number" min="1" max="31" value={editing.closingDay ?? ''} onChange={e => setEditing({ ...editing, closingDay: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label>Dia do vencimento<input required type="number" min="1" max="31" value={editing.dueDay ?? ''} onChange={e => setEditing({ ...editing, dueDay: e.target.value ? Number(e.target.value) : undefined })} /></label>
      </div><p className="settings-description">Em meses mais curtos, usamos o último dia disponível. Alterar o cartão principal atualiza a virada; os meses já gravados nos lançamentos são preservados.</p>
      <div className="payment-card-actions"><button type="button" className="settings-secondary" disabled={busy} onClick={() => setEditing(null)}>Cancelar edição</button><button className="settings-primary" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar cartão'}</button></div>
    </form>}
  </section>;
}
