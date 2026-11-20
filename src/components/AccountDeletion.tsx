import { useEffect, useRef, useState } from 'react';
import { useBackHandler } from '../hooks/useBackHandler';

export function AccountDeletion({ account, onCancel, onConfirm }: { account: string; onCancel: () => void; onConfirm: () => Promise<'cancelled' | 'accepted'> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [accepted, setAccepted] = useState(false);
  useBackHandler(true, () => { if (!busy && !accepted) onCancel(); }, 170);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  async function submit() {
    if (confirmation !== 'EXCLUIR' || busy) return;
    setBusy(true); setError('');
    try { if (await onConfirm() === 'accepted') setAccepted(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível confirmar o pedido. Confira a conexão e tente novamente.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={ref} className="backup-restore sereno-panel account-deletion" aria-labelledby="delete-account-title" onCancel={event => { event.preventDefault(); if (!busy && !accepted) onCancel(); }}>
    <h2 id="delete-account-title">{accepted ? 'Pedido de exclusão recebido' : 'Excluir conta e dados da nuvem'}</h2>
    {accepted ? <><p>O servidor continuará a remoção mesmo se você fechar o aplicativo. Sua conta do Finanças10 e seus lançamentos na nuvem serão excluídos. Isso não exclui sua conta Google.</p><p>A cópia financeira local e os backups que você exportou permanecem separados.</p><button type="button" className="sereno-primary" onClick={() => window.location.reload()}>Voltar ao modo local</button></> : <>
      <p className="backup-name">{account}</p>
      <p>Esta ação é permanente e vale para todos os meses e dispositivos: remove entradas, despesas, cartões, categorias, orçamentos e o cadastro do Finanças10 na nuvem.</p>
      <p>Sua conta Google, a cópia financeira local e arquivos de backup exportados permanecem. Você pode exportar seus dados antes de continuar. O acesso à conta será bloqueado quando o pedido for recebido.</p>
      <label>Digite EXCLUIR para continuar<input autoComplete="off" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></label>
      <p>Depois, confirme a mesma conta no Google. Cancelar essa confirmação não envia o pedido.</p>
      {error && <p role="alert">{error}</p>}
      <div className="backup-actions"><button type="button" className="sereno-secondary" disabled={busy} onClick={onCancel}>Cancelar</button><button type="button" className="settings-danger" disabled={busy || confirmation !== 'EXCLUIR'} onClick={() => void submit()}>{busy ? 'Confirmando…' : 'Confirmar com Google e excluir'}</button></div>
    </>}
  </dialog>;
}
