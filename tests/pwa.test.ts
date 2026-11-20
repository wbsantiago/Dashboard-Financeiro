import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activatePwaUpdate, getInstallPlatform, getInstallSteps } from '../src/utils/pwa';

test('installation instructions distinguish iPhone, iPad desktop mode, Android and desktop', () => {
  assert.equal(getInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), 'ios');
  assert.equal(getInstallPlatform('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)'), 'ios');
  assert.equal(getInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5), 'ios');
  assert.equal(getInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0), 'desktop');
  assert.equal(getInstallPlatform('Mozilla/5.0 (Linux; Android 15)'), 'android');
  assert.equal(getInstallPlatform('Mozilla/5.0 (Windows NT 10.0)'), 'desktop');
  assert.equal(getInstallPlatform('Mozilla/5.0 (X11; Linux x86_64)'), 'desktop');
  assert.ok(getInstallSteps('ios').some(step => step.includes('Compartilhar')));
  assert.ok(getInstallSteps('android').some(step => step.includes('menu ⋮')));
  assert.ok(getInstallSteps('desktop').some(step => step.includes('Chrome ou Edge')));
});

test('updates require a waiting version and explicit intent before sending skip-waiting', () => {
  let requested = false;
  assert.equal(activatePwaUpdate(null, () => { requested = true; }), false);
  assert.equal(activatePwaUpdate({ waiting: null }, () => { requested = true; }), false);
  assert.equal(requested, false);
  const messages: unknown[] = [];
  const waiting = { postMessage(message: unknown) { assert.equal(requested, true); messages.push(message); } } as ServiceWorker;
  assert.equal(activatePwaUpdate({ waiting }, () => { requested = true; }), true);
  assert.deepEqual(messages, [{ type: 'SKIP_WAITING' }]);
});
