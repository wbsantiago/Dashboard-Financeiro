import { Capacitor } from '@capacitor/core';
import type { AppData } from '../types';
import { getLocalDateStr } from './format';
import { DeviceFiles } from './deviceFiles';
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export function createBackup(data: AppData) {
  const envelope = { backupVersion: 1, exportedAt: new Date().toISOString(), data };
  let json = JSON.stringify(envelope, null, 2);
  if (new TextEncoder().encode(json).length > MAX_BACKUP_BYTES) json = JSON.stringify(envelope);
  if (new TextEncoder().encode(json).length > MAX_BACKUP_BYTES) throw new Error('O backup excede o limite de 10 MB.');
  return {
    fileName: `mes-de-boa-backup-${getLocalDateStr()}-${Date.now()}.json`,
    json,
  };
}
export async function saveBackupFile(data: AppData): Promise<'saved' | 'download' | 'cancelled'> {
  const file = createBackup(data);
  if (Capacitor.getPlatform() === 'android') return (await DeviceFiles.saveBackup(file)).cancelled ? 'cancelled' : 'saved';
  const url = URL.createObjectURL(new Blob([file.json], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = file.fileName;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'download';
}
export async function shareBackupFile(data: AppData) {
  const file = createBackup(data);
  const { url } = await DeviceFiles.prepareShare(file);
  const { Share } = await import('@capacitor/share');
  try { await Share.share({ files: [url], dialogTitle: 'Compartilhar backup do Mês de Boa' }); }
  catch (error) { if (!/cancel/i.test(String((error as { message?: string })?.message))) throw error; }
}
