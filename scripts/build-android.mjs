import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tools = path.resolve(repo, '../work/android-tools');
const localJava = path.join(tools, 'java');
const javaFolders = fs.existsSync(localJava) ? fs.readdirSync(localJava).map(name => path.join(localJava, name)) : [];
const javaHome = [process.env.JAVA_HOME, ...javaFolders].find(candidate => candidate && fs.existsSync(path.join(candidate, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')));
const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(tools, 'sdk')].find(candidate => candidate && fs.existsSync(path.join(candidate, 'platforms', 'android-36', 'android.jar')));
if (!javaHome || !sdk) {
  console.error('Configure Java 21 e Android SDK 36. Consulte ANDROID.md para preparar a compilação.');
  process.exit(1);
}

const userDir = path.join(tools, 'user');
fs.mkdirSync(userDir, { recursive: true });
fs.writeFileSync(path.join(repo, 'android/local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/').replace(':', '\\:')}\n`);
const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk,
  ANDROID_USER_HOME: userDir, GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || path.join(tools, 'gradle-cache') };
if (process.platform === 'win32') {
  // Java's Unix-domain wakeup pipe fails under packaged Windows apps when TEMP is redirected.
  // Use a project-local short path, without changing system Java or Windows settings.
  const javaTemp = path.join(tools, 'tmp');
  fs.mkdirSync(javaTemp, { recursive: true });
  const script = '[Console]::Write((New-Object -ComObject Scripting.FileSystemObject).GetFolder($env:FINANCAS10_JAVA_TMP).ShortPath)';
  const shortPath = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
    env: { ...env, FINANCAS10_JAVA_TMP: javaTemp }, encoding: 'utf8',
  });
  if (shortPath.status !== 0) throw new Error('Não foi possível preparar a pasta temporária do Java.');
  const temp = shortPath.stdout.trim();
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -Djdk.net.unixdomain.tmpdir="${temp}" -Djava.io.tmpdir="${temp}"`.trim();
}
const release = process.argv.includes('--release');
if (release) {
  env.FINANCAS10_SIGNING_PROPERTIES = process.env.FINANCAS10_SIGNING_PROPERTIES || path.join(tools, 'signing', 'release-signing.properties');
  if (!fs.existsSync(env.FINANCAS10_SIGNING_PROPERTIES)) throw new Error('Prepare a chave de upload com node scripts/prepare-android-signing.mjs.');
}
const tasks = release ? ['--no-daemon', ':app:bundleRelease', ':app:assembleRelease', ':app:lintRelease', ':app:testReleaseUnitTest'] : ['--no-daemon', 'assembleDebug', 'lintDebug', ':app:testDebugUnitTest'];
// Build instrumentation separately: never run Gradle's connected tests, which may uninstall the app.
if (process.argv.includes('--test-apk')) tasks.push(':app:assembleDebugAndroidTest');
console.log(release ? 'Compilando e verificando o pacote Android de distribuição…' : 'Compilando e verificando o aplicativo Android de teste…');
const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', `gradlew.bat ${tasks.join(' ')}`], { cwd: path.join(repo, 'android'), env, stdio: 'inherit' })
  : spawnSync('./gradlew', tasks, { cwd: path.join(repo, 'android'), env, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

const apk = path.join(repo, `android/app/build/outputs/apk/${release ? 'release/app-release' : 'debug/app-debug'}.apk`);
const version = fs.readFileSync(path.join(repo, 'android/app/build.gradle'), 'utf8').match(/versionName "([^"]+)"/)?.[1];
if (!version) throw new Error('Versão Android não encontrada.');
const destination = path.resolve(repo, `../work/artifacts/Financas10-Android-${release ? 'Candidato' : 'Teste'}-${version}.apk`);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(apk, destination);
console.log(`APK de teste: ${destination}`);
if (release) {
  const bundle = destination.replace(/\.apk$/, '.aab');
  fs.copyFileSync(path.join(repo, 'android/app/build/outputs/bundle/release/app-release.aab'), bundle);
  console.log(`AAB candidato: ${bundle}. Confira PLAY-STORE.md antes de enviar à loja.`);
}
