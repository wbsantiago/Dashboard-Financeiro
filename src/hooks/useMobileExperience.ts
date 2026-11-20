import { useEffect } from 'react';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { handleAppBack } from '../utils/backNavigation';
import { getUsableViewport, revealDialogField } from '../utils/mobileViewport';

export function useMobileExperience(theme: 'light' | 'dark') {
  useEffect(() => {
    const background = theme === 'light' ? '#f1f5f9' : '#0d141c';
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    if (Capacitor.isNativePlatform()) {
      void SystemBars.setStyle({ style: theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => {});
    }
  }, [theme]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('backButton', () => {
        // Android dismisses its keyboard before delivering back to this listener.
        if (!handleAppBack()) void App.minimizeApp().catch(() => {});
      });
      if (disposed) await listener.remove();
      else remove = () => listener.remove();
    }).catch(() => {});
    return () => { disposed = true; void remove?.(); };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const android = Capacitor.getPlatform() === 'android';
    let frame = 0;
    let revealFrame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(revealFrame);
      frame = requestAnimationFrame(() => {
        const geometry = getUsableViewport(android, window.innerHeight, viewport);
        if (!geometry) return;
        const root = document.documentElement;
        root.style.setProperty('--app-viewport-height', `${geometry.height}px`);
        root.style.setProperty('--app-viewport-top', `${geometry.top}px`);
        revealFrame = requestAnimationFrame(() => {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && focused.matches('input,select,textarea')) revealDialogField(focused);
        });
      });
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    if (!android) viewport?.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(revealFrame);
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      if (!android) viewport?.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--app-viewport-height');
      document.documentElement.style.removeProperty('--app-viewport-top');
    };
  }, []);
}
