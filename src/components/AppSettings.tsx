import React, { useEffect, useRef, useState } from 'react';
import { Wallet, Database, ShieldCheck, Palette, CircleHelp, X, Download, Upload, Cloud, Trash2, Mail } from 'lucide-react';
import { APP_CONTACT } from '../config/appContact';
import './AppSettings.css';

export type SettingsSection = 'budget' | 'data' | 'privacy' | 'appearance' | 'help';
const sections = [
  { id: 'budget', label: 'Orçamento do mês', icon: Wallet },
  { id: 'data', label: 'Dados e backups', icon: Database },
  { id: 'privacy', label: 'Privacidade', icon: ShieldCheck },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'help', label: 'Ajuda e contato', icon: CircleHelp },
] as const;

interface Props {
  demoMode?: boolean;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onClose: () => void;
  budgetContent: React.ReactNode;
  cloudConnected: boolean;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  privacyMode: boolean;
  onPrivacyModeChange: (value: boolean) => void;
  hideMobileBudgets: boolean;
  onHideMobileBudgetsChange: (value: boolean) => void;
  onExport: () => void;
  onImport: () => void;
  onUploadLocal: () => Promise<void>;
  onClearLocal: () => void;
  rememberAppearance: boolean;
  onOpenCookiePreferences: () => void;
  onDiagnostics: () => void;
}

export function AppSettings(p: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('Dúvida sobre o aplicativo');
  const cloud = p.cloudConnected;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { setError(''); }, [p.section]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await action(); }
    catch { setError('Não foi possível concluir. Verifique sua conexão e tente novamente.'); }
    finally { setBusy(false); }
  }

  return (
    <section id="settings-panel" className="app-settings" aria-labelledby="settings-title"
      onKeyDown={e => { if (e.key === 'Escape') p.onClose(); }}>
      <div className="settings-heading">
        <div><h2 id="settings-title" ref={heading} tabIndex={-1}>Configurações</h2><p>Seu planejamento, seus dados e suas preferências.</p></div>
        <button type="button" className="settings-icon-button" onClick={p.onClose} aria-label="Fechar configurações"><X size={20} /></button>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Seções das configurações">
          {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => p.onSectionChange(id)} aria-current={p.section === id ? 'page' : undefined}><Icon size={17} />{label}</button>)}
        </nav>
        <label className="settings-mobile-nav">Seção
          <select value={p.section} onChange={e => p.onSectionChange(e.target.value as SettingsSection)}>{sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </label>
        <div className="settings-content" aria-busy={busy}>
          <h3>{sections.find(s => s.id === p.section)?.label}</h3>
          {error && <p className="settings-error" role="alert">{error}</p>}
          {p.section === 'budget' && <><p className="settings-description">Ajuste a renda prevista, a meta de poupança e os cartões usados nos lançamentos.</p>{p.budgetContent}</>}
          {p.section === 'data' && <>
            <p className="settings-description">Você está usando os dados {p.demoMode ? 'fictícios da demonstração' : cloud ? 'da sua conta na nuvem' : 'deste navegador'}. Os arquivos de backup contêm suas informações financeiras; guarde-os com cuidado.</p>
            <div className="settings-action"><div><h4>Exportar backup</h4><p>Baixe os dados em uso em um arquivo JSON, incluindo lançamentos, orçamentos e cartões.</p></div><button type="button" className="settings-secondary" onClick={p.onExport}><Download size={16} />Exportar</button></div>
            <div className="settings-action"><div><h4>Importar backup</h4><p>{cloud ? 'Grava o arquivo na conta conectada. Registros com o mesmo identificador e as configurações podem ser substituídos.' : 'Substitui os dados financeiros deste navegador pelo conteúdo do arquivo.'}</p></div><button type="button" className="settings-secondary" onClick={p.onImport}><Upload size={16} />Importar</button></div>
            {cloud && <div className="settings-action"><div><h4>Enviar dados do navegador</h4><p>Envio manual para a conta conectada. Você confirma o destino antes de continuar; configurações e registros com o mesmo identificador podem ser substituídos.</p></div><button type="button" className="settings-secondary" disabled={busy} onClick={() => run(p.onUploadLocal)}><Cloud size={16} />Enviar</button></div>}
          </>}
          {p.section === 'privacy' && <>
            <p className="settings-description">{p.demoMode ? 'Você está explorando exemplos fictícios. Seus dados salvos permanecem separados da demonstração.' : cloud ? 'Os dados em uso são armazenados na nuvem, na conta conectada.' : 'Os dados em uso ficam neste navegador e neste dispositivo.'}</p>
            <div className="settings-action"><div><h4>Cookies e armazenamento</h4><p>Reveja as finalidades e permita ou revogue a gravação das preferências opcionais. Sua escolha não apaga os dados financeiros nem encerra a sessão.</p></div><button type="button" className="settings-secondary" onClick={p.onOpenCookiePreferences}>Gerenciar escolhas</button></div>
            <h4 className="settings-subtitle">Como seus dados são usados</h4>
            <ul className="settings-info-list">
              <li>O aplicativo usa os lançamentos, orçamentos e apelidos de cartões para organizar seu controle financeiro. Cadastre somente os quatro últimos dígitos do cartão.</li>
              <li>No uso local, limpar os dados do navegador pode apagar seus registros. Exporte um backup para guardar uma cópia.</li>
              <li>Ao conectar o Google, o aplicativo recebe dados de identificação da conta e usa o Firebase para autenticar e armazenar o planejamento. Os dados locais não são enviados automaticamente.</li>
              <li>Sair da conta encerra a sessão no aplicativo. Essa ação não apaga os dados da nuvem nem a cópia local anterior.</li>
            </ul>
            <button type="button" className="settings-text-button" onClick={() => p.onSectionChange('data')}>Ir para dados e backups →</button>
            {APP_CONTACT.responsibleName && <p className="settings-description">Responsável pelo aplicativo: {APP_CONTACT.responsibleName}.</p>}
            {APP_CONTACT.email && <p className="settings-description">Para dúvidas ou solicitações sobre seus dados, <button type="button" className="settings-text-button" onClick={() => p.onSectionChange('help')}>acesse o atendimento</button>.</p>}
            <div className="settings-danger-zone"><div><h4>{p.demoMode ? 'Dados da demonstração' : 'Dados deste navegador'}</h4><p>{p.demoMode ? 'Limpa os exemplos desta visualização. Atualize a página para carregá-los novamente.' : 'Apaga somente a cópia financeira local, incluindo cartões e orçamentos. Os dados da nuvem e os backups baixados permanecem. Você confirma na próxima etapa.'}</p></div><button type="button" className="settings-danger" onClick={p.onClearLocal}><Trash2 size={16} />{p.demoMode ? 'Limpar exemplos' : 'Apagar cópia local'}</button></div>
          </>}
          {p.section === 'appearance' && <>
            <p className="settings-description">{p.rememberAppearance ? 'Tema e exibição dos orçamentos podem ser lembrados neste navegador, conforme sua escolha de cookies.' : 'Tema e exibição dos orçamentos valem nesta visita. Para lembrá-los entre visitas, autorize as preferências opcionais.'} A opção de ocultar valores é mantida para respeitar sua privacidade na tela.</p>
            <button type="button" className="settings-text-button" onClick={p.onOpenCookiePreferences}>Rever preferências de cookies</button>
            <div className="settings-action"><div><h4>Tema</h4><p>Escolha a aparência ou acompanhe o tema do dispositivo.</p></div><div className="settings-theme-options" role="group" aria-label="Tema">{(['light', 'dark', 'system'] as const).map(t => <button type="button" key={t} className="settings-secondary" aria-pressed={p.theme === t} onClick={() => p.onThemeChange(t)}>{t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Automático'}</button>)}</div></div>
            <label className="settings-check"><div><h4>Ocultar valores</h4><p>Substitui os valores em reais por asteriscos (****) e oculta a escala numérica dos gráficos. Categorias, percentuais e gráficos continuam visíveis. Campos de valor são revelados durante a edição. Isso não altera nem protege o arquivo salvo.</p></div><input type="checkbox" checked={p.privacyMode} onChange={e => p.onPrivacyModeChange(e.target.checked)} /></label>
            <label className="settings-check"><div><h4>Recolher orçamentos no celular</h4><p>Deixe a visão mensal mais enxuta em telas pequenas.</p></div><input type="checkbox" checked={p.hideMobileBudgets} onChange={e => p.onHideMobileBudgetsChange(e.target.checked)} /></label>
          </>}
          {p.section === 'help' && <>
            <p className="settings-description">No uso local, os dados ficam neste navegador. Para ver os dados da nuvem, conecte a mesma conta Google usada anteriormente.</p>
            {APP_CONTACT.email && <div className="settings-contact"><h4>Falar com o atendimento</h4><p>Não envie senhas, números completos de cartão ou seu backup financeiro.</p><label>Assunto<select value={topic} onChange={e => setTopic(e.target.value)}>{['Dúvida sobre o aplicativo', 'Acesso aos meus dados', 'Correção dos meus dados', 'Exclusão dos meus dados', 'Problema técnico'].map(t => <option key={t}>{t}</option>)}</select></label><a className="settings-primary" href={`mailto:${APP_CONTACT.email}?subject=${encodeURIComponent(`Finanças10 — ${topic}`)}`}><Mail size={16} />Enviar email</a><p>{APP_CONTACT.email}</p></div>}
            <div className="settings-action"><div><h4>Diagnóstico da sincronização</h4><p>Teste manual da conexão com o Firebase. Cria registros de teste na sua conta e tenta removê-los ao terminar.</p></div><button type="button" className="settings-secondary" disabled={!cloud || busy} onClick={p.onDiagnostics}>Executar teste</button></div>
            {!cloud && <p className="settings-description">Conecte sua conta para executar o diagnóstico da nuvem.</p>}
          </>}
        </div>
      </div>
    </section>
  );
}
