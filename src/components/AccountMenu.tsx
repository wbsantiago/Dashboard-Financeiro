import React, { useEffect, useRef, useState } from 'react';
import { Database, LogIn, LogOut, ShieldCheck, UserRound, X, ChevronRight } from 'lucide-react';
import type { SettingsSection } from './AppSettings';
import './AccountMenu.css';

interface Props {
  user: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  cloudConnected: boolean;
  firebaseConfigured: boolean;
  demoMode: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onOpenSettings: (section: SettingsSection) => void;
}

export function AccountMenu(p: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  async function authenticate(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await action(); }
    catch { setError('Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(false); }
  }

  function goTo(section: SettingsSection) {
    close();
    p.onOpenSettings(section);
  }

  return (
    <div className="account-menu" ref={root}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close();
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close(true);
        }
      }}>
      <button type="button" ref={trigger} className="compact-header-button compact-header-avatar"
        aria-label="Meu perfil" title="Meu perfil" aria-haspopup="dialog"
        aria-expanded={open} aria-controls={open ? 'account-panel' : undefined}
        onClick={() => { setError(''); setOpen(value => !value); }}>
        {p.user?.photoURL ? <img src={p.user.photoURL} alt="" referrerPolicy="no-referrer" />
          : p.user ? <span>{(p.user.displayName || p.user.email || 'U').slice(0, 1).toUpperCase()}</span>
          : <UserRound size={18} />}
      </button>

      {open && (
        <div id="account-panel" className="account-panel" role="dialog" aria-labelledby="account-title" aria-busy={busy}>
          <div className="account-panel-heading">
            <h2 id="account-title" tabIndex={-1} ref={heading}>Meu perfil</h2>
            <button type="button" className="account-close" aria-label="Fechar perfil" onClick={() => close(true)}><X size={17} /></button>
          </div>
          <div className="account-identity">
            <span className="account-state">{p.user ? 'Conta Google conectada' : p.demoMode ? 'Demonstração 2026' : 'Uso neste navegador'}</span>
            <h3>{p.user?.displayName || 'Seu planejamento, com você'}</h3>
            {p.user?.email && <p className="account-email">{p.user.email}</p>}
            <p>{p.demoMode ? 'Explore o painel com os dados fictícios.' : p.cloudConnected ? 'Dados sincronizados com sua conta.' : 'Conecte sua conta para acessar seu planejamento na nuvem.'}</p>
          </div>
          {error && <p className="account-error" role="alert">{error}</p>}
          {p.user ? (
            <button type="button" className="account-secondary" disabled={busy} onClick={() => authenticate(p.onLogout)}><LogOut size={16} />{busy ? 'Aguarde…' : 'Sair da conta'}</button>
          ) : (
            <button type="button" className="account-primary" disabled={busy || !p.firebaseConfigured} onClick={() => authenticate(p.onLogin)}><LogIn size={16} />{busy ? 'Conectando…' : 'Conectar com Google'}</button>
          )}
          {p.demoMode && <p className="account-note">A conexão com Google fica desativada na demonstração.</p>}
          <div className="account-shortcuts">
            <button type="button" onClick={() => goTo('data')}><Database size={16} /><span>Dados e backups</span><ChevronRight size={15} /></button>
            <button type="button" onClick={() => goTo('privacy')}><ShieldCheck size={16} /><span>Privacidade dos dados</span><ChevronRight size={15} /></button>
          </div>
          <p className="account-note">Essas opções abrem as configurações.</p>
        </div>
      )}
    </div>
  );
}
