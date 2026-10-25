export const COOKIE_CHOICE_KEY = 'financas10-cookie-choice';
export const COOKIE_POLICY_VERSION = '2026-10-25';
export const COOKIE_CHOICE_TTL = 180 * 24 * 60 * 60 * 1000;
export const OPTIONAL_PREFERENCE_KEYS = ['app-theme', 'hide-mobile-budgets'] as const;
export type OptionalPreferenceKey = typeof OPTIONAL_PREFERENCE_KEYS[number];
export type ChoiceSource = 'banner' | 'preferences';
export interface CookieChoice {
  version: typeof COOKIE_POLICY_VERSION;
  necessary: true;
  preferences: boolean;
  source: ChoiceSource;
  decidedAt: string;
  expiresAt: string;
}
type BrowserStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStore(): BrowserStore | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

export function readNecessaryPreference(key: 'storage-type' | 'privacy-mode', fallback: string, storage = browserStore()): string {
  try { return storage?.getItem(key) ?? fallback; }
  catch { return fallback; }
}

export function writeNecessaryPreference(key: 'storage-type' | 'privacy-mode', value: string, storage = browserStore()): boolean {
  try { storage?.setItem(key, value); return !!storage; }
  catch { return false; }
}

export function isCurrentChoice(value: unknown, now = Date.now()): value is CookieChoice {
  if (!value || typeof value !== 'object') return false;
  const c = value as CookieChoice;
  if (typeof c.decidedAt !== 'string' || typeof c.expiresAt !== 'string') return false;
  const decided = Date.parse(c.decidedAt), expiry = Date.parse(c.expiresAt);
  return c.version === COOKIE_POLICY_VERSION && c.necessary === true
    && typeof c.preferences === 'boolean' && ['banner', 'preferences'].includes(c.source)
    && Number.isFinite(decided) && decided <= now
    && expiry === decided + COOKIE_CHOICE_TTL && expiry > now;
}

export function readCookieChoice(storage = browserStore(), now = Date.now()): CookieChoice | null {
  try {
    const raw = storage?.getItem(COOKIE_CHOICE_KEY);
    const choice = raw ? JSON.parse(raw) : null;
    return isCurrentChoice(choice, now) ? choice : null;
  } catch { return null; }
}

export function clearOptionalPreferences(storage = browserStore()): boolean {
  let cleared = !!storage;
  for (const key of OPTIONAL_PREFERENCE_KEYS) {
    try { storage?.removeItem(key); }
    catch { cleared = false; }
  }
  return cleared;
}

export function synchronizeCookieChoice(storage = browserStore(), now = Date.now()): CookieChoice | null {
  const choice = readCookieChoice(storage, now);
  if (!choice) {
    try { storage?.removeItem(COOKIE_CHOICE_KEY); }
    catch { /* An unusable record is still ignored when storage is blocked. */ }
  }
  if (!choice?.preferences) clearOptionalPreferences(storage);
  return choice;
}

export function saveCookieChoice(preferences: boolean, source: ChoiceSource,
  storage = browserStore(), now = Date.now()) {
  const choice: CookieChoice = { version: COOKIE_POLICY_VERSION, necessary: true, preferences, source,
    decidedAt: new Date(now).toISOString(), expiresAt: new Date(now + COOKIE_CHOICE_TTL).toISOString() };
  let persisted = false;
  try {
    storage?.setItem(COOKIE_CHOICE_KEY, JSON.stringify(choice));
    persisted = !!storage;
  } catch { /* The interface must report that this choice is temporary. */ }
  const cleared = preferences || clearOptionalPreferences(storage);
  return { choice, persisted, cleared };
}

function mayRemember(choice: CookieChoice | null, storage: BrowserStore | null, now: number) {
  if (!isCurrentChoice(choice, now) || !choice.preferences) return false;
  const saved = readCookieChoice(storage, now);
  // Recheck storage to respect a withdrawal in another tab before its event is handled.
  return saved?.preferences === true && saved.decidedAt === choice.decidedAt;
}

export function readDisplayPreference(key: OptionalPreferenceKey, fallback: string,
  choice: CookieChoice | null, storage = browserStore(), now = Date.now()): string {
  if (!mayRemember(choice, storage, now)) return fallback;
  try { return storage?.getItem(key) ?? fallback; }
  catch { return fallback; }
}

export function writeDisplayPreference(key: OptionalPreferenceKey, value: string,
  choice: CookieChoice | null, storage = browserStore(), now = Date.now()): boolean {
  if (!mayRemember(choice, storage, now)) return false;
  try { storage?.setItem(key, value); return !!storage; }
  catch { return false; }
}
