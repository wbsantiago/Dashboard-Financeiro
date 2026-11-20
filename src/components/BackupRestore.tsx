import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';

export function BackupRestore({ backup, onCancel, onConfirm }: {
  backup: { data: AppData; fileName: string }; onCancel: () => void; onConfirm: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useBackHandler(true, () => { if (!busy) onCancel(); }, 160);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  const confirm = async () => { setBusy(true); setError(''); try { await onConfirm(); } catch { setError('Não foi possível restaurar. A cópia anterior foi mantida. Confira o espaço disponível e tente novamente.'); } finally { setBusy(false); } };
  return <dialog ref={ref} className="backup-restore sereno-panel" aria-labelledby="restore-title" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="restore-title">Restaurar backup local</h2><p className="backup-name">{backup.fileName}</p>
    <dl><div><dt>Despesas</dt><dd>{backup.data.expenses.length}</dd></div><div><dt>Entradas</dt><dd>{backup.data.revenues?.length ?? 0}</dd></div><div><dt>Cartões</dt><dd>{backup.data.creditCards?.length ?? 0}</dd></div></dl>
    <p>O arquivo substituirá sua cópia financeira local. A conta Google e os dados da nuvem permanecem como estão. Você pode exportar um backup da cópia atual antes de continuar.</p>
    {error && <p role="alert">{error}</p>}<div className="backup-actions"><button type="button" className="sereno-secondary" disabled={busy} onClick={onCancel}>Cancelar</button><button type="button" className="sereno-primary" disabled={busy} onClick={() => { void confirm(); }}>{busy ? 'Restaurando…' : 'Restaurar cópia local'}</button></div>
  </dialog>;
}
