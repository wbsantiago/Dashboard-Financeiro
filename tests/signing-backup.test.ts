import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createSigningBackup, recoverSigningBackup, restoreSigningBackup } from '../scripts/signing-backup.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const fixture = () => Object.fromEntries(['financas10-upload.p12', 'release-signing.properties', 'financas10-upload-certificate.pem', 'debug.keystore'].map(name => [name, randomBytes(4000)]));
test('signing backup recovers each byte, with bounded Bitwarden secure notes and randomized authenticated encryption', () => {
  const files = fixture(), one = createSigningBackup(files), two = createSigningBackup(files);
  assert.notEqual(one.envelope.toString('base64'), two.envelope.toString('base64'));
  assert.ok(one.document.items.every(item => item.type === 2 && item.notes.length <= 5000));
  const recovered = recoverSigningBackup(one.document);
  for (const [name, bytes] of Object.entries(files)) assert.ok(bytes.equals(recovered[name]));
});
test('missing or duplicate note parts cannot silently restore an incomplete key', () => {
  const backup = createSigningBackup(fixture());
  const missing = structuredClone(backup.document); missing.items.pop(); assert.throws(() => recoverSigningBackup(missing));
  const duplicate = structuredClone(backup.document); duplicate.items.push(duplicate.items[1]); assert.throws(() => recoverSigningBackup(duplicate));
});
test('tampered parts or recovery key fail before returning any files', () => {
  const backup = createSigningBackup(fixture());
  const damaged = structuredClone(backup.document); damaged.items[1].notes += 'A'; assert.throws(() => recoverSigningBackup(damaged));
  const wrong = structuredClone(backup.document); wrong.items[0].notes = wrong.items[0].notes.replace(/^KEY:.+$/m, `KEY:${randomBytes(32).toString('base64')}`); assert.throws(() => recoverSigningBackup(wrong));
});
test('restore refuses an existing directory, validates before writing, and preserves paths containing dollar signs', () => {
  const work = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../work');
  const root = fs.mkdtempSync(path.join(work, 'signing-fixture-'));
  const files = fixture(); files['release-signing.properties'] = Buffer.from('storeFile=old-file.p12\nkeyAlias=fake\n');
  const backup = createSigningBackup(files), target = path.join(root, 'new-$&-copy');
  try {
    assert.throws(() => restoreSigningBackup(backup.document, root));
    assert.deepEqual(fs.readdirSync(root), []);
    assert.throws(() => restoreSigningBackup({ items: [] }, target));
    assert.equal(fs.existsSync(target), false);
    restoreSigningBackup(backup.document, target);
    assert.equal(fs.readFileSync(path.join(target, 'financas10-upload.p12')).equals(files['financas10-upload.p12']), true);
    assert.equal(fs.readFileSync(path.join(target, 'release-signing.properties'), 'utf8').split('\n')[0], `storeFile=${path.join(target, 'financas10-upload.p12').replaceAll('\\', '/')}`);
  } finally {
    if (fs.existsSync(target)) { for (const name of Object.keys(files)) fs.unlinkSync(path.join(target, name)); fs.rmdirSync(target); }
    fs.rmdirSync(root);
  }
});
