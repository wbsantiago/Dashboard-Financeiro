import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { handleAppBack, registerBackHandler } from '../src/utils/backNavigation';
import { getUsableViewport, revealDialogField } from '../src/utils/mobileViewport';

test('back closes only the frontmost surface, then returns through navigation before minimizing', () => {
  const calls: string[] = [], removals: (() => void)[] = [];
  try {
    removals.push(registerBackHandler(() => { calls.push('overview'); return false; }, 0));
    const closeProfile = registerBackHandler(() => { calls.push('profile'); }, 100); removals.push(closeProfile);
    const closeSettings = registerBackHandler(() => { calls.push('settings'); }, 120); removals.push(closeSettings);
    const closeCookies = registerBackHandler(() => { calls.push('cookies'); }, 200); removals.push(closeCookies);
    assert.equal(handleAppBack(), true); assert.deepEqual(calls, ['cookies']); closeCookies();
    assert.equal(handleAppBack(), true); assert.deepEqual(calls, ['cookies', 'settings']); closeSettings();
    assert.equal(handleAppBack(), true); assert.equal(calls.at(-1), 'profile'); closeProfile();
    assert.equal(handleAppBack(), false); assert.equal(calls.at(-1), 'overview');
  } finally { removals.forEach(remove => remove()); }
  assert.equal(handleAppBack(), false);
});
test('equal-priority nested surfaces close in reverse opening order; a busy surface consumes back', () => {
  let closed = '';
  const parent = registerBackHandler(() => { closed = 'parent'; });
  const busyChild = registerBackHandler(() => {});
  try { assert.equal(handleAppBack(), true); assert.equal(closed, ''); busyChild(); assert.equal(handleAppBack(), true); assert.equal(closed, 'parent'); }
  finally { busyChild(); parent(); }
});

const source = fs.readFileSync(new URL('../src/hooks/useMobileExperience.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
function mobile(platform: 'android' | 'web', delayedListener = false) {
  const effects: (() => void | (() => void))[] = [], style: Record<string, any> = {}, events = new Map<string, () => void>();
  const barStyles: string[] = [], calls: string[] = [], exports: any = {};
  let back: (() => void) | undefined, consumed = true, release: (() => void) | undefined;
  const viewport = { height: 790, offsetTop: 0, addEventListener: (name: string, action: () => void) => events.set(`viewport:${name}`, action), removeEventListener: (name: string) => events.delete(`viewport:${name}`) };
  const listener = { remove: async () => { calls.push('removed'); } };
  const surface = { visualViewport: viewport, innerHeight: 790, addEventListener: (name: string, action: () => void) => events.set(name, action), removeEventListener: (name: string) => events.delete(name) };
  class Element {}
  const modules: Record<string, any> = {
    react: { useEffect: (effect: any) => effects.push(effect) },
    '@capacitor/core': { Capacitor: { isNativePlatform: () => platform === 'android', getPlatform: () => platform }, SystemBarsStyle: { Light: 'LIGHT', Dark: 'DARK' }, SystemBars: { setStyle: async ({ style }: any) => { barStyles.push(style); } } },
    '../utils/backNavigation': { handleAppBack: () => consumed },
    '../utils/mobileViewport': { getUsableViewport, revealDialogField },
    '@capacitor/app': { App: { addListener: async (event: string, action: () => void) => { assert.equal(event, 'backButton'); calls.push('listened'); back = action; if (delayedListener) await new Promise<void>(resolve => { release = resolve; }); return listener; }, minimizeApp: async () => { calls.push('minimized'); } } },
  };
  vm.runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    document: { documentElement: { style: Object.assign(style, { setProperty: (key: string, value: string) => { style[key] = value; }, removeProperty: (key: string) => { delete style[key]; } }) }, body: { style: {} }, querySelector: () => ({ setAttribute() {} }), activeElement: null },
    window: surface,
    HTMLElement: Element, requestAnimationFrame: (action: () => void) => { action(); return 1; }, cancelAnimationFrame() {},
  });
  return { render(theme: string) { exports.useMobileExperience(theme); const cleanup = effects.splice(0).map(effect => effect()).filter(Boolean) as (() => void)[]; return () => cleanup.forEach(remove => remove()); },
    viewport, surface, events, style, calls, barStyles, pressBack() { back?.(); }, allowMinimize() { consumed = false; }, release() { release?.(); } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('Android system icons follow the app theme; back minimizes only when the UI has nothing left to close', async () => {
  for (const theme of ['light', 'dark']) {
    const app = mobile('android'); const cleanup = app.render(theme); await flush();
    assert.deepEqual(app.barStyles, [theme === 'light' ? 'LIGHT' : 'DARK']);
    app.pressBack(); assert.equal(app.calls.includes('minimized'), false);
    app.allowMinimize(); app.pressBack(); assert.equal(app.calls.at(-1), 'minimized');
    cleanup(); await flush(); assert.equal(app.calls.at(-1), 'removed'); assert.equal(app.events.size, 0);
  }
});
test('late native registration is removed after unmount, including React StrictMode remounts', async () => {
  const app = mobile('android', true); const cleanup = app.render('dark'); await flush(); cleanup(); app.release(); await flush();
  assert.deepEqual(app.calls, ['listened', 'removed']);
});
test('keyboard/rotation viewport changes resize the usable area and web never registers native APIs', async () => {
  const app = mobile('web'); const cleanup = app.render('light'); await flush();
  assert.equal(app.style['--app-viewport-height'], '790px');
  app.viewport.height = 330; app.viewport.offsetTop = 15; app.events.get('viewport:resize')?.();
  assert.equal(app.style['--app-viewport-height'], '330px'); assert.equal(app.style['--app-viewport-top'], '15px');
  assert.deepEqual(app.calls, []); assert.deepEqual(app.barStyles, []);
  cleanup(); assert.equal(app.events.size, 0); assert.equal(app.style['--app-viewport-height'], undefined);
});

test('Android rotation ignores visual viewport panning and zero-height transitions, preserving the last valid form bounds', async () => {
  const app = mobile('android'); const cleanup = app.render('dark'); await flush();
  app.viewport.height = 180; app.viewport.offsetTop = 220; app.events.get('viewport:resize')?.();
  assert.equal(app.style['--app-viewport-height'], '790px'); assert.equal(app.style['--app-viewport-top'], '0px');
  assert.equal(app.events.has('viewport:scroll'), false);
  app.surface.innerHeight = 330; app.events.get('resize')?.();
  assert.equal(app.style['--app-viewport-height'], '330px');
  app.surface.innerHeight = 0; app.viewport.height = 0; app.events.get('resize')?.();
  assert.equal(app.style['--app-viewport-height'], '330px');
  app.surface.innerHeight = 790; app.events.get('resize')?.();
  assert.equal(app.style['--app-viewport-height'], '790px'); assert.equal(app.style['--app-viewport-top'], '0px');
  cleanup();
});

test('invalid rotation measurements never collapse an overlay and browser geometry keeps its independent viewport', () => {
  assert.equal(getUsableViewport(true, 0, { height: 300, offsetTop: 80 }), null);
  assert.equal(getUsableViewport(true, NaN, null), null);
  assert.deepEqual(getUsableViewport(true, 380, { height: 160, offsetTop: 90 }), { height: 380, top: 0 });
  assert.deepEqual(getUsableViewport(false, 800, { height: 420, offsetTop: 15 }), { height: 420, top: 15 });
  assert.deepEqual(getUsableViewport(false, 800, { height: 0, offsetTop: 0 }), { height: 800, top: 0 });
});

test('revealing a focused field scrolls only its dialog, without moving the page/header or repeating a scroll', () => {
  const original = globalThis.getComputedStyle;
  let bodyTouched = false;
  const body = { get scrollTop() { bodyTouched = true; throw new Error('background must not scroll'); } };
  const dialog: any = { scrollTop: 0, clientTop: 0, clientHeight: 200, scrollHeight: 1000, parentElement: body,
    getBoundingClientRect: () => ({ top: 100 }), contains: (element: unknown) => element === dialog };
  const field: any = { closest: () => dialog, parentElement: dialog,
    getBoundingClientRect: () => ({ top: 600 - dialog.scrollTop, bottom: 640 - dialog.scrollTop }),
    scrollIntoView: () => { throw new Error('global scrollIntoView must never run'); } };
  globalThis.getComputedStyle = (() => ({ overflowY: 'auto' })) as any;
  try {
    revealDialogField(field); assert.equal(dialog.scrollTop, 352); assert.equal(bodyTouched, false);
    revealDialogField(field); assert.equal(dialog.scrollTop, 352); assert.equal(bodyTouched, false);
  } finally { if (original) globalThis.getComputedStyle = original; else delete (globalThis as any).getComputedStyle; }
});
