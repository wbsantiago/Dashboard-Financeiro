import { useEffect, useRef, useState } from 'react';
import { activatePwaUpdate, getInstallPlatform, type InstallPromptEvent } from '../utils/pwa';
import { isNativeApp } from '../utils/platform';
import { useConnectivity } from './useConnectivity';

export function usePwa() {
  const online = useConnectivity();
  const [installed, setInstalled] = useState(() => isNativeApp || window.matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [shellReady, setShellReady] = useState(isNativeApp);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const reloadRequested = useRef(false);
  const updateTimeout = useRef<number | undefined>(undefined);
  const platform = getInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const modeChanged = () => setInstalled(isNativeApp || display.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const captureInstall = (event: Event) => { if (!isNativeApp) { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); } };
    const didInstall = () => { setInstalled(true); setInstallPrompt(null); setMessage(''); };
    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', didInstall);
    display.addEventListener('change', modeChanged);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', didInstall);
      display.removeEventListener('change', modeChanged);
    };
  }, []);

  useEffect(() => {
    if (isNativeApp || !import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    let stopped = false;
    let lastCheck = 0;
    const cleanups: (() => void)[] = [];
    const inspect = (current: ServiceWorkerRegistration) => {
      if (stopped) return;
      if (current.active) setShellReady(true);
      if (current.waiting && navigator.serviceWorker.controller) { setNeedRefresh(true); setUpdateDismissed(false); }
    };
    const reload = () => {
      if (reloadRequested.current) window.location.reload();
      else setShellReady(true);
    };
    const check = () => {
      if (!navigator.onLine || !registration.current || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      void registration.current.update().catch(() => { /* Keep the current version when the network is unavailable. */ });
    };
    navigator.serviceWorker.addEventListener('controllerchange', reload);
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).then(current => {
      if (stopped) return;
      registration.current = current;
      inspect(current);
      const watch = () => {
        const worker = current.installing;
        if (!worker) return;
        const changed = () => {
          if (!stopped && worker.state === 'installed') {
            setShellReady(true);
            inspect(current);
          }
        };
        worker.addEventListener('statechange', changed);
        cleanups.push(() => worker.removeEventListener('statechange', changed));
      };
      current.addEventListener('updatefound', watch);
      cleanups.push(() => current.removeEventListener('updatefound', watch));
      watch();
      check();
    }).catch(() => { if (!stopped) setError('Não foi possível preparar a abertura sem internet. Continue pelo site e tente novamente com conexão.'); });
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    const visible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', visible);
    const timer = window.setInterval(check, 60 * 60 * 1000);
    return () => {
      stopped = true;
      cleanups.forEach(cleanup => cleanup());
      navigator.serviceWorker.removeEventListener('controllerchange', reload);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      document.removeEventListener('visibilitychange', visible);
      window.clearInterval(timer);
      window.clearTimeout(updateTimeout.current);
    };
  }, []);

  const install = async () => {
    if (!installPrompt || installing || installed) return;
    setInstalling(true); setError(''); setMessage('');
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setMessage(choice.outcome === 'accepted' ? 'Conclua a instalação no navegador.' : 'Instalação cancelada. Você pode tentar novamente pelo menu do navegador.');
    } catch { setError('Não foi possível abrir a instalação. Use as instruções abaixo para instalar pelo navegador.'); }
    finally { setInstallPrompt(null); setInstalling(false); }
  };

  const update = () => {
    if (updating) return;
    setError('');
    const requested = activatePwaUpdate(registration.current, () => { reloadRequested.current = true; setUpdating(true); });
    if (!requested) { setNeedRefresh(false); setMessage('A versão já foi ativada. Salve o que estiver editando e reabra o aplicativo para usá-la.'); return; }
    updateTimeout.current = window.setTimeout(() => {
      reloadRequested.current = false; setUpdating(false);
      setError('A atualização demorou mais que o esperado. Salve suas alterações e reabra o aplicativo.');
    }, 20_000);
  };

  return { native: isNativeApp, online, installed, canInstall: !!installPrompt && !installed, installing, install,
    shellReady, needRefresh, updateDismissed, dismissUpdate: () => setUpdateDismissed(true), updating, update, message, error, platform };
}

export type PwaState = ReturnType<typeof usePwa>;
