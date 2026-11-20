import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { setCloudConnection } from '../utils/cloudWrites';

export function useConnectivity() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    let disposed = false;
    const removals: (() => Promise<void>)[] = [];
    const apply = (connected: boolean, native = false) => {
      if (disposed) return;
      setCloudConnection(connected, native); setOnline(connected);
      // Firestore's web connectivity monitor also receives native reconnection events.
      if (native) window.dispatchEvent(new Event(connected ? 'online' : 'offline'));
    };
    const update = () => { if (!Capacitor.isNativePlatform()) apply(navigator.onLine); };
    window.addEventListener('online', update); window.addEventListener('offline', update);
    if (Capacitor.isNativePlatform()) void (async () => {
      const { Network } = await import('@capacitor/network');
      const { App } = await import('@capacitor/app');
      const refresh = async () => apply((await Network.getStatus()).connected, true);
      const network = await Network.addListener('networkStatusChange', status => apply(status.connected, true));
      if (disposed) await network.remove(); else removals.push(() => network.remove());
      const resume = await App.addListener('resume', () => { void refresh().catch(() => {}); });
      if (disposed) await resume.remove(); else removals.push(() => resume.remove());
      await refresh();
    })().catch(() => { if (!disposed) apply(navigator.onLine); });
    else apply(navigator.onLine);
    return () => { disposed = true; window.removeEventListener('online', update); window.removeEventListener('offline', update); removals.forEach(remove => { void remove().catch(() => {}); }); };
  }, []);
  return online;
}
