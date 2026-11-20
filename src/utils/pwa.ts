export type InstallPlatform = 'ios' | 'android' | 'desktop';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function getInstallPlatform(userAgent: string, platform = '', touchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) return 'ios';
  return /Android/i.test(userAgent) ? 'android' : 'desktop';
}

export function getInstallSteps(platform: InstallPlatform): string[] {
  if (platform === 'ios') return ['Abra este site no Safari.', 'Toque em Compartilhar e escolha Adicionar à Tela de Início.', 'Se aparecer, ative Abrir como App e toque em Adicionar.'];
  if (platform === 'android') return ['Abra este site no Chrome.', 'Abra o menu ⋮ e escolha Instalar aplicativo ou Adicionar à tela inicial.', 'Confirme a instalação. O Finanças10 ficará junto dos seus aplicativos.'];
  return ['No Chrome ou Edge, procure o ícone de instalação na barra de endereço ou a opção de instalar no menu.', 'No Safari do Mac, use Arquivo → Adicionar ao Dock, quando disponível.', 'Se a opção não aparecer, você pode continuar usando o site normalmente.'];
}

/** Never switch all open tabs to a new version without a deliberate reload. */
export function activatePwaUpdate(registration: Pick<ServiceWorkerRegistration, 'waiting'> | null, onRequested: () => void): boolean {
  if (!registration?.waiting) return false;
  onRequested();
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
