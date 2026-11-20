import { Capacitor } from '@capacitor/core';
import type { AppData } from '../types';
import { DeviceFiles } from './deviceFiles';

const SNAPSHOT_KEY = 'controle_financeiro_snapshot_v1';
const LEGACY_KEY = 'controle_financeiro_data';
type Snapshot = { version: 1; revision: number; data: AppData };
type Driver = { readSnapshot(): Promise<{ snapshot: string | null }>; writeSnapshot(options: { snapshot: string }): Promise<void> };

/** Serializes atomic native saves and selects the newest valid copy on restart. */
export class NativeLocalStore {
  current: Snapshot | null = null;
  private queue: Promise<void> = Promise.resolve();
  private failed = false;
  private revision = 0;
  get hasSaveError() { return this.failed; }
  constructor(private driver: Driver, private web: Pick<Storage, 'getItem' | 'setItem'>, private validate: (json: string) => AppData, private report: () => void = () => {}) {}
  private parse(json: string | null): Snapshot | null {
    if (!json) return null;
    const value = JSON.parse(json);
    if (value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error('Cópia interna inválida.');
    return { version: 1, revision: value.revision, data: this.validate(JSON.stringify(value.data)) };
  }
  async initialize() {
    let disk: { snapshot: string | null } = { snapshot: null };
    let native: Snapshot | null = null, browser: Snapshot | null = null;
    let invalid = false;
    try { disk = await this.driver.readSnapshot(); } catch { invalid = true; }
    try { native = this.parse(disk.snapshot); } catch { invalid = true; }
    try {
      const envelope = this.web.getItem(SNAPSHOT_KEY);
      if (envelope) browser = this.parse(envelope);
      else {
        const legacy = this.web.getItem(LEGACY_KEY);
        if (legacy) browser = { version: 1, revision: 0, data: this.validate(legacy) };
      }
    } catch { invalid = true; }
    const chosen = native && (!browser || native.revision >= browser.revision) ? native : browser;
    if (!chosen && invalid) throw new Error('Não foi possível recuperar a cópia local. Os arquivos foram preservados; tente reabrir o aplicativo.');
    this.current = chosen;
    this.revision = chosen?.revision ?? 0;
    if (chosen) {
      this.writeWeb(chosen);
      // A revision upgrade repairs an invalid or older mirror without resetting financial data.
      if (!native || native.revision < chosen.revision) {
        try { await this.driver.writeSnapshot({ snapshot: JSON.stringify(chosen) }); }
        catch { this.failed = true; this.report(); }
      }
    }
  }
  private writeWeb(snapshot: Snapshot) {
    try {
      this.web.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      this.web.setItem(LEGACY_KEY, JSON.stringify(snapshot.data));
    } catch { /* The private native copy remains authoritative when WebView storage is unavailable. */ }
  }
  private next(data: AppData): Snapshot {
    this.revision = Math.max(Date.now(), this.revision + 1);
    return { version: 1, revision: this.revision, data: structuredClone(data) };
  }
  save(data: AppData) {
    const next = this.next(data);
    this.current = next;
    this.writeWeb(next);
    this.queue = this.queue.catch(() => {}).then(async () => {
      try { await this.driver.writeSnapshot({ snapshot: JSON.stringify(next) }); this.failed = false; }
      catch (error) { this.failed = true; this.report(); throw error; }
    });
    // Handle rejection here as well as in flush(), preventing unhandled background failures.
    void this.queue.catch(() => {});
  }
  async restore(data: AppData) {
    const next = this.next(data);
    const operation = this.queue.catch(() => {}).then(async () => {
      await this.driver.writeSnapshot({ snapshot: JSON.stringify(next) });
      // A later save may already have a newer WebView copy while waiting in the same queue.
      if (!this.current || this.current.revision <= next.revision) { this.current = next; this.writeWeb(next); }
      this.failed = false;
    });
    this.queue = operation;
    await operation;
  }
  async flush() { await this.queue; if (this.failed) throw new Error('A cópia interna ainda não foi salva. Exporte um backup.'); }
}

let local: NativeLocalStore | null = null;
export async function bootstrapNativeStorage(validate: (json: string) => AppData) {
  if (Capacitor.getPlatform() !== 'android') return;
  local = new NativeLocalStore(DeviceFiles, {
    getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
  }, validate, () => window.dispatchEvent(new Event('local-save-failed')));
  await local.initialize();
}
export function getNativeLocalData() { return local?.current?.data ? structuredClone(local.current.data) : null; }
export function hasNativeStorageError() { return local?.hasSaveError ?? false; }
export function saveNativeLocalData(data: AppData) { if (!local) return false; local.save(data); return true; }
export async function flushNativeLocalData() { await local?.flush(); }
export async function restoreNativeLocalData(data: AppData) { if (!local) return false; await local.restore(data); return true; }
