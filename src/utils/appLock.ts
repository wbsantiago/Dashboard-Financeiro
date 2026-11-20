import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AppLockStatus {
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  deviceSecure: boolean;
  biometricAvailable: boolean;
  timeoutSeconds: number;
}
interface AppLockPlugin {
  getStatus(): Promise<AppLockStatus>;
  setEnabled(options: { enabled: boolean }): Promise<AppLockStatus>;
  setTimeout(options: { seconds: number }): Promise<AppLockStatus>;
  openSecuritySettings(): Promise<void>;
}
const AppLock = registerPlugin<AppLockPlugin>('AppLock');
export const appLockAvailableHere = () => Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
export const APP_LOCK_INTERVALS = [0, 30, 60, 300] as const;
export async function getAppLockStatus(): Promise<AppLockStatus> {
  if (!appLockAvailableHere()) return { supported: false, enabled: false, locked: false, deviceSecure: false, biometricAvailable: false, timeoutSeconds: 30 };
  return AppLock.getStatus();
}
export async function changeAppLock(enabled: boolean) {
  if (!appLockAvailableHere()) throw new Error('Disponível no aplicativo Android instalado.');
  // Only the native plugin can persist changes, after the Android authentication succeeds.
  return AppLock.setEnabled({ enabled });
}
export async function changeAppLockInterval(seconds: number) {
  if (!appLockAvailableHere() || !APP_LOCK_INTERVALS.includes(seconds as typeof APP_LOCK_INTERVALS[number])) throw new Error('Intervalo de bloqueio inválido.');
  return AppLock.setTimeout({ seconds });
}
export async function openAndroidSecuritySettings() {
  if (appLockAvailableHere()) await AppLock.openSecuritySettings();
}
