import { registerPlugin } from '@capacitor/core';

export const DeviceFiles = registerPlugin<{
  readSnapshot(): Promise<{ snapshot: string | null }>;
  writeSnapshot(options: { snapshot: string }): Promise<void>;
  saveBackup(options: { json: string; fileName: string }): Promise<{ cancelled: boolean }>;
  openBackup(): Promise<{ cancelled: boolean; json?: string; fileName?: string }>;
  prepareShare(options: { json: string; fileName: string }): Promise<{ url: string }>;
}>('DeviceFiles');
