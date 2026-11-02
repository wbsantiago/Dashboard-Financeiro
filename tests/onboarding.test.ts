import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tourStorageKey, readTourChoice, saveTourChoice } from '../src/utils/onboarding';

function storage() {
  const values = new Map<string, string>([['financial-data', 'untouched'], ['financas10-cookie-choice', 'untouched']]);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
test('first access is eligible; completion and dismissal remain remembered across reads', () => {
  for (const choice of ['completed', 'dismissed'] as const) {
    const store = storage(), key = tourStorageKey(null);
    assert.equal(readTourChoice(key, store), null);
    assert.equal(saveTourChoice(key, choice, store), true);
    assert.equal(readTourChoice(key, store), choice);
    assert.equal(store.values.get('financial-data'), 'untouched');
    assert.equal(store.values.get('financas10-cookie-choice'), 'untouched');
    assert.equal(store.values.size, 3);
  }
});
test('local use and each Google account have separate first-visit records', () => {
  const store = storage();
  saveTourChoice(tourStorageKey(null), 'dismissed', store);
  assert.equal(readTourChoice(tourStorageKey('user-a'), store), null);
  saveTourChoice(tourStorageKey('user-a'), 'completed', store);
  assert.equal(readTourChoice(tourStorageKey('user-a'), store), 'completed');
  assert.equal(readTourChoice(tourStorageKey('user-b'), store), null);
  assert.notEqual(tourStorageKey(null), tourStorageKey('local'));
});
test('unavailable storage and demo mode never throw or require persistent storage', () => {
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(readTourChoice(tourStorageKey(null), blocked), null);
  assert.equal(saveTourChoice(tourStorageKey(null), 'dismissed', blocked), false);
  assert.equal(saveTourChoice(tourStorageKey(null), 'completed', null), false);
  assert.equal(readTourChoice(tourStorageKey(null), null), null);
});
test('unknown or damaged records do not silently prevent the first-visit recommendation', () => {
  const store = storage(), key = tourStorageKey(null);
  for (const value of ['', '{}', 'false', 'done', 'undefined']) {
    store.setItem(key, value);
    assert.equal(readTourChoice(key, store), null);
  }
});
