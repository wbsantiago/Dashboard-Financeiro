import { useState } from 'react';
import type { AppData } from '../types';
import { DeviceFiles } from '../utils/deviceFiles';
import { importDataFromJSON, restoreAppData } from '../utils/storage';
import { BackupRestore } from './BackupRestore';
import { useMobileExperience } from '../hooks/useMobileExperience';

export function StartupRecovery({ onRetry }: { onRetry: () => Promise<void> }) {
  const [backup, setBackup] = useState<{ data: AppData; fileName: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useMobileExperience('dark');
  const pick = async () => {
    setBusy(true); setError('');
    try {
      const file = await DeviceFiles.openBackup();
      if (!file.cancelled && file.json !== undefined) setBackup({ data: importDataFromJSON(file.json), fileName: file.fileName || 'backup.json' });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível abrir o backup.'); }
    finally { setBusy(false); }
  };
  return <main className="sereno-app theme-dark"><section className="sereno-panel m-6 max-w-xl"><h1 className="text-xl mb-4">Seus dados locais precisam de atenção</h1><p>Não foi possível recuperar a cópia salva. Os arquivos foram preservados. Você pode tentar novamente ou escolher um backup para restaurar a cópia local. Sua conta Google permanece como está.</p>
    {error && <p role="alert" className="mt-4">{error}</p>}<div className="backup-actions"><button type="button" disabled={busy} className="sereno-secondary" onClick={() => { void onRetry(); }}>Tentar novamente</button><button type="button" disabled={busy} className="sereno-primary" onClick={() => { void pick(); }}>Escolher backup</button></div>
    {backup && <BackupRestore backup={backup} onCancel={() => setBackup(null)} onConfirm={async () => { await restoreAppData(backup.data); setBackup(null); await onRetry(); }} />}
  </section></main>;
}
