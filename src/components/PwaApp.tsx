import { Download, Smartphone, RefreshCw, WifiOff, Check, Cloud } from 'lucide-react';
import type { PwaState } from '../hooks/usePwa';
import { getInstallSteps } from '../utils/pwa';
import './PwaApp.css';
import { nativePreviewMode } from '../utils/platform';

export function PwaSettings({ pwa, cloudConnected, demoMode = false }: { pwa: PwaState; cloudConnected: boolean; demoMode?: boolean }) {
  if (pwa.native) return <div className="pwa-settings">
    <div className="pwa-install-intro"><img src="/icons/app-192.png" width="64" height="64" alt="" /><div><h4>Finanças10 para Android</h4><p>{import.meta.env.VITE_NATIVE_RELEASE === 'true' ? 'Versão Android' : 'Versão de teste'} · {import.meta.env.VITE_ANDROID_VERSION}</p></div></div>
    <h4>Seu planejamento neste aplicativo</h4>
    <p>Cadastre entradas e despesas, consulte os gráficos e ajuste seu planejamento. Sem login, os dados ficam neste aplicativo, separados do navegador.</p>
    <h4 className="settings-subtitle">Conexão com Google</h4>
    <p>{nativePreviewMode ? 'Esta compilação ainda não tem a configuração Google do Android.' : cloudConnected ? 'Sua conta usa o mesmo planejamento na nuvem do site. Os lançamentos locais continuam separados.' : 'Conecte a mesma conta Google do site pelo perfil. Os lançamentos locais não são enviados automaticamente.'}</p>
    <h4 className="settings-subtitle">Abertura sem internet</h4>
    <p>Os arquivos do painel vêm com o aplicativo. Sem internet, você pode criar e editar os registros locais. Na conta Google, consulte os dados que já foram carregados neste aparelho e reconecte-se para alterar a conta.</p>
    <h4 className="settings-subtitle">Cópia local e backups</h4>
    <p>A cópia local também é gravada na área interna do Android. Em Dados e backups, você pode salvar um arquivo, compartilhar ou restaurar uma cópia após conferir o resumo. Restaurar um backup não envia dados para a conta Google.</p>
    <h4 className="settings-subtitle">Atualizações</h4>
    <p>{import.meta.env.VITE_NATIVE_RELEASE === 'true' ? 'Quando distribuído pela Google Play, as atualizações chegarão pela loja.' : 'As próximas versões de teste serão instaladas por um novo APK.'} Atualizar mantendo o mesmo aplicativo preserva os dados locais; desinstalar pode apagá-los.</p>
  </div>;
  return <div className="pwa-settings">
    <div className="pwa-install-intro">
      <img src="/icons/app-192.png" width="64" height="64" alt="" />
      <div><h4>Finanças10 no seu dispositivo</h4><p>Abra pelo ícone, em uma janela própria, e continue com o mesmo planejamento.</p></div>
    </div>
    {pwa.error && <p className="settings-error" role="alert">{pwa.error}</p>}
    {pwa.message && <p className="pwa-message" role="status">{pwa.message}</p>}
    <div className="settings-action">
      <div><h4 className="pwa-install-title">{pwa.installed && <Check size={16} aria-hidden="true" />}{pwa.installed ? 'Aplicativo instalado' : 'Instalar aplicativo'}</h4><p>{pwa.installed ? 'O Finanças10 está pronto para abrir pelo ícone do dispositivo.' : 'A instalação pelo navegador é gratuita e não exige a Play Store ou a App Store.'}</p></div>
      {!pwa.installed && (pwa.canInstall && !demoMode
        ? <button type="button" className="settings-primary" disabled={pwa.installing} onClick={pwa.install}><Download size={16} />{pwa.installing ? 'Instalando…' : 'Instalar Finanças10'}</button>
        : <Smartphone size={22} aria-hidden="true" />)}
    </div>
    {!pwa.installed && <>
      <h4 className="settings-subtitle">{pwa.platform === 'ios' ? 'No iPhone ou iPad' : pwa.platform === 'android' ? 'No Android' : 'Pelo navegador do computador'}</h4>
      {demoMode ? <p>Para instalar seu planejamento, saia da demonstração e abra o aplicativo com seus dados.</p>
        : <ol className="settings-info-list pwa-install-steps">{getInstallSteps(pwa.platform).map(step => <li key={step}>{step}</li>)}</ol>}
    </>}
    <h4 className="settings-subtitle">Seus dados continuam seus</h4>
    <p>{cloudConnected ? 'A mesma conta Google acessa o mesmo planejamento na nuvem, no site e no aplicativo. Para entrar e confirmar alterações na nuvem, mantenha a conexão com a internet.' : 'Neste modo, seus dados ficam no dispositivo. Para compartilhar o planejamento entre celular e computador, conecte a mesma conta Google. A instalação não envia seus dados locais para a nuvem.'}</p>
    <p className="pwa-spaced">Alguns sistemas separam o armazenamento do aplicativo e do navegador. Se o planejamento local não aparecer após instalar, volte ao navegador e exporte um backup em Dados e backups, ou use sua conta na nuvem.</p>
    <div className="settings-action">
      <div><h4>Abertura sem internet</h4><p>{demoMode ? 'Os exemplos são temporários.' : pwa.shellReady ? 'Os arquivos do aplicativo estão guardados neste dispositivo. Você pode reabrir o painel sem conexão e usar os dados locais já salvos. Os dados da nuvem dependem da conexão e do que estiver disponível nesta sessão.' : 'Na primeira visita com internet, o aplicativo prepara os arquivos para você poder reabri-lo depois sem conexão.'}</p></div>
    </div>
    <div className="settings-action">
      <div><h4>{pwa.needRefresh ? 'Nova versão disponível' : 'Atualizações do aplicativo'}</h4><p>{pwa.needRefresh ? 'Salve os lançamentos que estiver editando antes de atualizar. A página será recarregada.' : 'Quando uma nova versão estiver pronta, você poderá escolher quando recarregar. Seus dados salvos serão mantidos.'}</p></div>
      {pwa.needRefresh && <button type="button" className="settings-primary" disabled={pwa.updating} onClick={pwa.update}><RefreshCw size={16} />{pwa.updating ? 'Atualizando…' : 'Atualizar e recarregar'}</button>}
    </div>
  </div>;
}

export function PwaStatus({ pwa, cloudConnected, showUpdate, cloudMessage = '' }: { pwa: PwaState; cloudConnected: boolean; showUpdate: boolean; cloudMessage?: string }) {
  return <>
    {cloudMessage ? <div className="pwa-status" role="status"><Cloud size={17} aria-hidden="true" /><p>{cloudMessage}</p></div> : !pwa.online && <div className="pwa-status" role="status"><WifiOff size={17} aria-hidden="true" /><p>{cloudConnected ? 'Sem internet. Consulte a cópia da conta neste aparelho; conecte-se para editar.' : 'Sem internet. Usando os dados locais deste dispositivo.'}</p></div>}
    {showUpdate && pwa.needRefresh && !pwa.updateDismissed && <section className="pwa-status pwa-update" aria-label="Atualização do aplicativo">
      <RefreshCw size={18} aria-hidden="true" /><div><strong>Nova versão disponível</strong><p>Salve o que estiver editando antes de recarregar.</p></div>
      <div className="pwa-update-actions"><button type="button" onClick={pwa.dismissUpdate}>Depois</button><button type="button" className="pwa-update-primary" disabled={pwa.updating} onClick={pwa.update}>{pwa.updating ? 'Atualizando…' : 'Atualizar e recarregar'}</button></div>
    </section>}
  </>;
}
