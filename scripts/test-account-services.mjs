import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = path.resolve(repo, '../work'), tools = path.join(work, 'android-tools');
const javaRoot = path.join(tools, 'java');
const java = [process.env.JAVA_HOME, ...(fs.existsSync(javaRoot) ? fs.readdirSync(javaRoot).map(name => path.join(javaRoot, name)) : [])].find(p => p && fs.existsSync(path.join(p, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')));
const cli = process.env.FINANCAS10_FIREBASE_CLI || path.join(work, 'firebase-tools/node_modules/firebase-tools/lib/bin/firebase.js');
if (!java || !fs.existsSync(cli)) throw new Error('Prepare Java 21 e Firebase CLI em ../work/firebase-tools antes do teste.');
const config = path.join(work, 'firebase-emulators.json');
fs.writeFileSync(config, JSON.stringify({ firestore: { rules: path.join(repo, 'firestore.rules') }, emulators: { auth: { host: '127.0.0.1', port: 9098 }, firestore: { host: '127.0.0.1', port: 8089 }, hub: { host: '127.0.0.1', port: 4409 }, logging: { host: '127.0.0.1', port: 4509 }, ui: { enabled: false }, singleProjectMode: true } }, null, 2));
const env = { ...process.env, JAVA_HOME: java, PATH: `${path.join(java, 'bin')}${path.delimiter}${process.env.PATH}`, GCLOUD_PROJECT: 'demo-financas10', FIREBASE_EMULATORS_PATH: path.join(work, 'firebase-emulators'), CI: 'true' };
if (process.platform === 'win32') {
  const temp = path.join(tools, 'tmp'); fs.mkdirSync(temp, { recursive: true });
  const command = '[Console]::Write((New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:FINANCAS10_JAVA_TMP).ShortPath)';
  const short = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { env: { ...env, FINANCAS10_JAVA_TMP: temp }, encoding: 'utf8' });
  if (short.status !== 0) throw new Error('Não foi possível preparar o temporário Java.');
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -Djdk.net.unixdomain.tmpdir="${short.stdout.trim()}" -Djava.io.tmpdir="${short.stdout.trim()}"`.trim();
}
const testFiles = ['emulator.test.mjs', 'manual-support.emulator.test.mjs'].map(name => `"${path.join(repo, 'functions', name)}"`).join(' ');
const result = spawnSync(process.execPath, [cli, 'emulators:exec', '--project', 'demo-financas10', '--config', config, '--only', 'auth,firestore', `node --test --test-concurrency=1 ${testFiles}`], { cwd: work, env, stdio: 'inherit' });
process.exit(result.status || (result.error ? 1 : 0));
