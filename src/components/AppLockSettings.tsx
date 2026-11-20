import { useEffect, useRef, useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { appLockAvailableHere, getAppLockStatus, changeAppLock, changeAppLockInterval, openAndroidSecuritySettings, type AppLockStatus } from '../utils/appLock';

export function AppLockSettings() {
  const [status, setStatus] = useState<AppLockStatus | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const mutating = useRef(false), revision = useRef(0);
  async function refresh() { setError(''); try { setStatus(await getAppLockStatus()); } catch { setError('Não foi possível consultar a proteção do Android. Tente novamente.'); } }
  useEffect(() => {
    let active = true;
    const load = () => {
      if (mutating.current) return;
      const requestedRevision = revision.current;
      void getAppLockStatus().then(value => { if (active && !mutating.current && requestedRevision === revision.current) { setStatus(value); setError(''); } })
        .catch(() => { if (active && !mutating.current && requestedRevision === revision.current) setError('Não foi possível consultar a proteção do Android. Tente novamente.'); });
    };
    load();
    let remove: (() => Promise<void>) | undefined;
    if (appLockAvailableHere()) void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('appStateChange', ({ isActive }) => { if (isActive) load(); });
      if (!active) await listener.remove(); else remove = () => listener.remove();
    }).catch(() => {});
    return () => { active = false; void remove?.(); };
  }, []);
  async function run(action: () => Promise<AppLockStatus>) {
    if (mutating.current) return;
    mutating.current = true; revision.current++;
    setBusy(true); setError('');
    try { setStatus(await action()); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'A confirmação não foi concluída. A configuração anterior foi mantida.'); }
    finally { mutating.current = false; revision.current++; setBusy(false); }
  }
  return <section className="settings-app-lock" aria-labelledby="app-lock-title" aria-busy={busy}>
    <h4 id="app-lock-title" className="settings-subtitle"><Fingerprint size={19} aria-hidden="true" /> Proteção no celular</h4>
    {status?.supported === false ? <p className="settings-description">Biometria e bloqueio automático estão disponíveis no aplicativo Android instalado. O navegador mantém seu funcionamento atual.</p> : <>
      <p className="settings-description">Peça a biometria ou o PIN, padrão ou senha do próprio celular para abrir o Finanças10. A configuração vale para este aparelho, tanto no modo local quanto na conta Google.</p>
      {status && <>
        <div className="settings-action"><div><h4>{status.enabled ? 'Bloqueio ativado' : 'Bloqueio desativado'}</h4><p>{!status.deviceSecure ? 'Configure primeiro um PIN, padrão ou senha no Android.' : status.biometricAvailable ? 'Biometria disponível, com alternativa pelo bloqueio do celular.' : 'Você pode usar o PIN, padrão ou senha do celular. A biometria depende da configuração do Android.'}</p></div><button type="button" className={status.enabled ? 'settings-secondary' : 'settings-primary'} disabled={busy || !status.deviceSecure} onClick={() => void run(() => changeAppLock(!status.enabled))}><ShieldCheck size={16} />{busy ? 'Confirmando…' : status.enabled ? 'Desativar bloqueio' : 'Ativar bloqueio'}</button></div>
        {!status.deviceSecure && <button type="button" className="settings-secondary" disabled={busy} onClick={() => { void openAndroidSecuritySettings().catch(() => setError('Abra as configurações de segurança do Android para configurar o bloqueio.')); }}>Abrir segurança do Android</button>}
        {status.enabled && <label className="app-lock-interval">Bloquear ao ficar fora do app<select value={status.timeoutSeconds} disabled={busy} onChange={event => { const seconds = Number(event.target.value); void run(() => changeAppLockInterval(seconds)); }}><option value={0}>Imediatamente</option><option value={30}>Após 30 segundos</option><option value={60}>Após 1 minuto</option><option value={300}>Após 5 minutos</option></select></label>}
        <p className="settings-description">Ativar, desativar ou mudar o intervalo exige confirmação do Android. Ao abrir o aplicativo depois de encerrado ou ao apagar a tela do celular, o bloqueio é imediato. No intervalo escolhido, o app preserva seu formulário ao retornar.</p>
        <p className="settings-description">Enquanto ativado, oculta a tela nos aplicativos recentes e impede capturas e gravações da tela do Finanças10. Seus backups exportados permanecem acessíveis no destino escolhido. O aplicativo recebe apenas o resultado da confirmação; não recebe sua impressão digital ou senha do celular.</p>
      </>}
      {!status && !error && <p className="settings-description" role="status">Consultando proteção do Android…</p>}
    </>}
    {error && <div className="settings-error" role="alert"><p>{error}</p>{!status && <button type="button" className="settings-secondary" onClick={() => void refresh()}>Tentar novamente</button>}</div>}
  </section>;
}
