import React, { useEffect, useRef, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import type { ChoiceSource, CookieChoice } from '../utils/cookieConsent';
import './CookieConsent.css';

interface Props {
  choice: CookieChoice | null;
  managerOpen: boolean;
  demoMode: boolean;
  notice: string;
  onOpenManager: () => void;
  onCloseManager: () => void;
  onChoose: (preferences: boolean, source: ChoiceSource) => void;
  onPrivacy: () => void;
}

export function CookieConsent(p: Props) {
  const [preferences, setPreferences] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!p.managerOpen) return;
    setPreferences(p.choice?.preferences ?? false);
    const previous = previousFocus.current ?? document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    heading.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previousFocus.current = null;
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true });
      else document.getElementById('cookie-preferences-trigger')?.focus({ preventScroll: true });
    };
  }, [p.managerOpen]);

  function openManager() {
    previousFocus.current = document.activeElement as HTMLElement;
    p.onOpenManager();
  }

  function keyboard(event: React.KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); p.onCloseManager(); }
    if (event.key !== 'Tab') return;
    const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], summary, [tabindex="0"]') ?? [])];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  return <>
    {!p.choice && <section className="cookie-banner" hidden={p.managerOpen} aria-label="Cookies e armazenamento">
      <div className="cookie-intro"><h2><Cookie size={18} />Cookies e armazenamento</h2>
        <p>Salvamos o necessário para seu planejamento e sua sessão. Você escolhe se podemos lembrar o tema e a exibição dos orçamentos no celular. Os opcionais começam desativados. Aceitar ou rejeitar tudo aplica-se aos opcionais; os necessários permanecem ativos.</p>
        <button type="button" className="cookie-text-link" onClick={openManager}>Saiba como usamos o armazenamento</button>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-reject" onClick={() => p.onChoose(false, 'banner')}>Rejeitar tudo</button>
        <button type="button" onClick={openManager}>Personalizar</button>
        <button type="button" className="cookie-accept" onClick={() => p.onChoose(true, 'banner')}>Aceitar tudo</button>
      </div>
    </section>}

    {p.notice && !p.managerOpen && <div className="cookie-notice" role="status">{p.notice}</div>}

    {p.managerOpen && <div className="cookie-overlay" onMouseDown={event => { if (event.target === event.currentTarget) p.onCloseManager(); }}>
      <div className="cookie-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-describedby="cookie-description" onKeyDown={keyboard}>
        <header className="cookie-heading"><div><h2 id="cookie-title" tabIndex={-1} ref={heading}>Cookies e armazenamento</h2><p id="cookie-description">Escolha os opcionais. Os necessários permanecem ativos.</p></div>
          <button type="button" aria-label="Fechar preferências de cookies" onClick={p.onCloseManager}><X size={20} /></button>
        </header>
        <div className="cookie-dialog-content">
          <p>Além de cookies usados pelos serviços de login, o Finanças10 utiliza o armazenamento do navegador. Não usamos ferramentas de publicidade ou análise de audiência neste aplicativo.</p>
          <div className="cookie-category"><div><h3>Necessários</h3><p>Permitem salvar seu planejamento local, registrar esta escolha, identificar o modo de armazenamento e manter a sessão quando você usa Google. A escolha de ocultar valores é mantida para respeitar sua privacidade na tela.</p></div><span className="cookie-required">Sempre ativos</span></div>
          <label className="cookie-category cookie-optional"><div><h3>Lembrar preferências de aparência</h3><p>Guarda o tema claro/escuro e a opção de recolher os orçamentos no celular entre visitas. Sem autorização, você continua usando essas opções durante a visita.</p></div><input type="checkbox" checked={preferences} onChange={event => setPreferences(event.target.checked)} /></label>
          <details className="cookie-details"><summary>O que é armazenado e por quanto tempo?</summary>
            <dl>
              <dt>Planejamento financeiro</dt><dd>Lançamentos, cartões e orçamentos ficam neste navegador até você apagar a cópia local ou limpar os dados do site. Rejeitar opcionais não apaga suas finanças.</dd>
              <dt>Login e ocultação de valores</dt><dd>Google/Firebase mantém a sessão nos recursos do navegador. Para encerrá-la, use Meu perfil → Sair da conta. A opção de ocultar valores e o modo local/nuvem permanecem até serem alterados ou removidos do navegador.</dd>
              <dt>Escolha de cookies</dt><dd>A decisão, sua data e a versão deste aviso têm validade de 180 dias. Ao acessar o aplicativo após esse prazo, descartamos o registro vencido e pedimos uma nova escolha. Esse prazo foi definido para o aplicativo.</dd>
              <dt>Preferências opcionais</dt><dd>Tema e exibição dos orçamentos são guardados somente após aceitar, por até a validade desta escolha. Ao rejeitar ou revogar, removemos somente essas preferências salvas; o visual atual pode continuar até você sair da página.</dd>
            </dl>
          </details>
          <p>Você pode rever ou revogar a autorização a qualquer momento em Privacidade ou pelo link Cookies e preferências no rodapé. Nas configurações do navegador, também é possível bloquear cookies e limpar os dados deste site; isso pode afetar a sessão e o planejamento salvo localmente.</p>
          <p>O login Google é uma escolha separada. Cookies do provedor são gerenciados também no navegador e na sua conta Google. As preferências de aparência e esta decisão não são enviadas ao Firebase.</p>
          <button type="button" className="cookie-text-link" onClick={() => { p.onCloseManager(); p.onPrivacy(); }}>Ver privacidade dos dados</button>
          {p.demoMode && <p className="cookie-message">Na demonstração, as escolhas são temporárias e não alteram as preferências do uso normal.</p>}
          {p.notice && <p className="cookie-message" role="status">{p.notice}</p>}
        </div>
        <footer className="cookie-actions cookie-dialog-actions">
          <button type="button" className="cookie-reject" onClick={() => p.onChoose(false, 'preferences')}>Rejeitar tudo</button>
          <button type="button" onClick={() => p.onChoose(preferences, 'preferences')}>Salvar escolhas</button>
          <button type="button" className="cookie-accept" onClick={() => p.onChoose(true, 'preferences')}>Aceitar tudo</button>
        </footer>
      </div>
    </div>}
  </>;
}
