import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_CHOICE_KEY, COOKIE_POLICY_VERSION, COOKIE_CHOICE_TTL, clearOptionalPreferences,
  readNecessaryPreference, writeNecessaryPreference, isCurrentChoice, synchronizeCookieChoice, readCookieChoice, readDisplayPreference, saveCookieChoice, writeDisplayPreference } from '../src/utils/cookieConsent';
import { loadAppData } from '../src/utils/storage';

const now = Date.UTC(2026, 9, 25, 12);
function store() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => { throw Error('Never clear unrelated storage'); } };
}

test('optional storage is denied before a valid, explicit choice', () => {
  const s = store();
  s.setItem('app-theme', 'light');
  assert.equal(readCookieChoice(s, now), null);
  assert.equal(readDisplayPreference('app-theme', 'dark', null, s, now), 'dark');
  assert.equal(writeDisplayPreference('hide-mobile-budgets', 'true', null, s, now), false);
  assert.equal(s.getItem('hide-mobile-budgets'), null);
});

test('acceptance records purpose, date, version and duration, then enables preferences', () => {
  const s = store();
  const result = saveCookieChoice(true, 'banner', s, now);
  assert.equal(result.persisted, true);
  assert.equal(result.choice.version, COOKIE_POLICY_VERSION);
  assert.equal(Date.parse(result.choice.expiresAt), now + COOKIE_CHOICE_TTL);
  assert.equal(writeDisplayPreference('app-theme', 'light', result.choice, s, now), true);
  assert.equal(readDisplayPreference('app-theme', 'dark', result.choice, s, now), 'light');
});

test('refusal and withdrawal remove only the optional keys, preserving money, privacy and session', () => {
  const s = store();
  for (const key of ['controle_financeiro_data', 'privacy-mode', 'storage-type', 'firebase-session']) s.setItem(key, 'keep');
  const accepted = saveCookieChoice(true, 'banner', s, now).choice;
  writeDisplayPreference('app-theme', 'light', accepted, s, now);
  writeDisplayPreference('hide-mobile-budgets', 'true', accepted, s, now);
  const rejected = saveCookieChoice(false, 'preferences', s, now + 1000);
  assert.equal(rejected.persisted, true);
  assert.equal(s.getItem('app-theme'), null);
  assert.equal(s.getItem('hide-mobile-budgets'), null);
  for (const key of ['controle_financeiro_data', 'privacy-mode', 'storage-type', 'firebase-session']) assert.equal(s.getItem(key), 'keep');
  assert.equal(readCookieChoice(s, now + 1000)?.preferences, false);
});

test('stale tabs cannot write optional data after another tab withdraws consent', () => {
  const s = store();
  const old = saveCookieChoice(true, 'banner', s, now).choice;
  saveCookieChoice(false, 'preferences', s, now + 1);
  assert.equal(writeDisplayPreference('app-theme', 'light', old, s, now + 2), false);
  assert.equal(readDisplayPreference('app-theme', 'dark', old, s, now + 2), 'dark');
});

test('expired or old-policy choices never enable preferences', () => {
  const s = store();
  const choice = saveCookieChoice(true, 'banner', s, now).choice;
  assert.equal(readCookieChoice(s, now + COOKIE_CHOICE_TTL), null);
  assert.equal(writeDisplayPreference('app-theme', 'light', choice, s, now + COOKIE_CHOICE_TTL), false);
  assert.equal(isCurrentChoice({ ...choice, version: 'old' }, now), false);
  assert.equal(isCurrentChoice({ ...choice, decidedAt: null }, now), false);
  assert.equal(isCurrentChoice({ ...choice, preferences: 'true' }, now), false);
  assert.equal(isCurrentChoice({ ...choice, necessary: false }, now), false);
});

test('corrupt or unavailable storage stays denied and reports a temporary choice', () => {
  const s = store();
  s.setItem(COOKIE_CHOICE_KEY, 'broken-json');
  assert.equal(readCookieChoice(s, now), null);
  const unavailable = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); }, removeItem: () => { throw Error('blocked'); } };
  const result = saveCookieChoice(true, 'preferences', unavailable, now);
  assert.equal(result.persisted, false);
  assert.equal(writeDisplayPreference('app-theme', 'light', result.choice, unavailable, now), false);
  assert.equal(clearOptionalPreferences(unavailable), false);
});

test('resetting an older financial format does not clear the cookie decision or auth state', () => {
  const s = store();
  const choice = saveCookieChoice(false, 'banner', s, now).choice;
  s.setItem('controle_financeiro_data', JSON.stringify({ expenses: [], categoryBudgets: [] }));
  s.setItem('firebase-session', 'keep-session');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: s });
  try {
    loadAppData();
    assert.deepEqual(readCookieChoice(s, now), choice);
    assert.equal(s.getItem('firebase-session'), 'keep-session');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('expired choices are removed on the next visit without clearing necessary storage', () => {
  const s = store();
  saveCookieChoice(true, 'banner', s, now);
  s.setItem('app-theme', 'light');
  s.setItem('privacy-mode', 'true');
  assert.equal(synchronizeCookieChoice(s, now + COOKIE_CHOICE_TTL), null);
  assert.equal(s.getItem(COOKIE_CHOICE_KEY), null);
  assert.equal(s.getItem('app-theme'), null);
  assert.equal(s.getItem('privacy-mode'), 'true');
});

test('necessary preferences fall back without throwing when browser storage is blocked', () => {
  const blocked = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); }, removeItem: () => {} };
  assert.equal(readNecessaryPreference('storage-type', 'local', blocked), 'local');
  assert.equal(readNecessaryPreference('privacy-mode', 'false', blocked), 'false');
  assert.equal(writeNecessaryPreference('privacy-mode', 'true', blocked), false);
});
