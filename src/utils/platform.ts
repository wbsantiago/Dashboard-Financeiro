import { Capacitor } from '@capacitor/core';

export const isNativeApp = Capacitor.isNativePlatform() || import.meta.env.MODE === 'native';
// Unconfigured native builds stay local; web keeps its existing Firebase setup.
export const nativePreviewMode = isNativeApp && import.meta.env.VITE_NATIVE_AUTH_READY !== 'true';
