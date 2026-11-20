import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const names = ['financas10-upload.p12', 'release-signing.properties', 'financas10-upload-certificate.pem', 'debug.keystore'];
const hash = value => createHash('sha256').update(value).digest('hex');
export function createSigningBackup(files) {
  if (names.some(name => !Buffer.isBuffer(files[name]))) throw new Error('Material de assinatura incompleto.');
  const id = randomUUID(), key = randomBytes(32), iv = randomBytes(12);
  const payload = gzipSync(Buffer.from(JSON.stringify(names.map(name => ({ name, content: files[name].toString('base64'), sha256: hash(files[name]) })))));
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`financas10-signing-v1:${id}`));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const envelope = Buffer.from(JSON.stringify({ format: 'financas10-signing-v1', id, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') }));
  const encoded = envelope.toString('base64'), pieces = encoded.match(/.{1,4000}/g);
  const note = (name, notes) => ({ id: randomUUID(), organizationId: null, folderId: null, type: 2, reprompt: 0, name, notes, favorite: false, secureNote: { type: 0 } });
  const items = [note('Finanças10 — assinatura — recuperação', `Material privado de assinatura Android. Guarde todas as partes deste conjunto. Não enviar por chat ou email.\nF10-RECOVERY:${id}\nKEY:${key.toString('base64')}\nSHA256:${hash(envelope)}\nA recuperação requer também todas as notas F10-PART deste mesmo conjunto.\nAplicativos: io.github.wbsantiago.financas10 e io.github.wbsantiago.financas10.preview.`), ...pieces.map((part, index) => note(`Finanças10 — assinatura — parte ${index + 1} de ${pieces.length}`, `F10-PART:${id}:${index + 1}/${pieces.length}\n${part}`))];
  if (items.some(item => item.notes.length > 5000)) throw new Error('Nota excede o limite seguro de importação.');
  return { envelope, document: { encrypted: false, folders: [], items }, id };
}

export function recoverSigningBackup(document) {
  if (!Array.isArray(document?.items) || document.items.length > 10000) throw new Error('Arquivo de notas inválido.');
  const keys = document.items.filter(item => /^F10-RECOVERY:/m.test(item.notes || ''));
  if (keys.length !== 1) throw new Error('Selecione um único conjunto de backup, sem notas duplicadas.');
  const info = keys[0].notes, id = info.match(/^F10-RECOVERY:([a-f0-9-]+)$/m)?.[1];
  const key = Buffer.from(info.match(/^KEY:([A-Za-z0-9+/=]+)$/m)?.[1] || '', 'base64');
  const expectedHash = info.match(/^SHA256:([a-f0-9]{64})$/m)?.[1];
  if (!id || key.length !== 32 || !expectedHash) throw new Error('Nota de recuperação inválida.');
  const parts = document.items.map(item => String(item.notes || '').match(/^F10-PART:([a-f0-9-]+):(\d+)\/(\d+)\r?\n([A-Za-z0-9+/=\r\n]+)$/)).filter(match => match?.[1] === id);
  const count = Number(parts[0]?.[3]);
  if (!Number.isInteger(count) || count < 1 || count > 100 || parts.length !== count || new Set(parts.map(p => Number(p[2]))).size !== count || parts.some(p => Number(p[3]) !== count || Number(p[2]) < 1 || Number(p[2]) > count)) throw new Error('Faltam partes ou existem partes repetidas.');
  const encoded = parts.sort((a, b) => Number(a[2]) - Number(b[2])).map(p => p[4].replace(/\s/g, '')).join('');
  if (encoded.length > 1000000) throw new Error('Backup excede o tamanho esperado.');
  const envelope = Buffer.from(encoded, 'base64');
  if (hash(envelope) !== expectedHash) throw new Error('Backup alterado ou incompleto.');
  const data = JSON.parse(envelope.toString('utf8'));
  if (data.format !== 'financas10-signing-v1' || data.id !== id) throw new Error('Formato de backup incompatível.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'base64'));
  decipher.setAAD(Buffer.from(`financas10-signing-v1:${id}`)); decipher.setAuthTag(Buffer.from(data.tag, 'base64'));
  const plain = gunzipSync(Buffer.concat([decipher.update(Buffer.from(data.data, 'base64')), decipher.final()]), { maxOutputLength: 1000000 });
  const entries = JSON.parse(plain.toString('utf8'));
  if (!Array.isArray(entries) || entries.length !== names.length || new Set(entries.map(e => e.name)).size !== names.length) throw new Error('Arquivos de assinatura inválidos.');
  const files = {};
  for (const entry of entries) {
    if (!names.includes(entry.name)) throw new Error('Nome de arquivo não permitido.');
    const buffer = Buffer.from(entry.content, 'base64');
    if (hash(buffer) !== entry.sha256) throw new Error('Arquivo recuperado não confere.');
    files[entry.name] = buffer;
  }
  return files;
}

export function restoreSigningBackup(document, destination) {
  const files = recoverSigningBackup(document), target = path.resolve(destination);
  if (fs.existsSync(target)) throw new Error('A pasta de recuperação já existe.');
  fs.mkdirSync(target, { mode: 0o700 });
  if (process.platform === 'win32') {
    const identity = spawnSync('whoami.exe', [], { encoding: 'utf8' });
    if (identity.status !== 0) throw new Error('Não foi possível restringir a pasta.');
    const acl = spawnSync('icacls.exe', [target, '/inheritance:r', '/grant:r', `${identity.stdout.trim()}:(OI)(CI)F`], { encoding: 'utf8' });
    if (acl.status !== 0) throw new Error('Não foi possível restringir a pasta.');
  }
  const properties = files['release-signing.properties'].toString('utf8').replace(/^storeFile=.*$/m, () => `storeFile=${path.join(target, 'financas10-upload.p12').replaceAll('\\', '/')}`);
  for (const name of names) fs.writeFileSync(path.join(target, name), name === 'release-signing.properties' ? properties : files[name], { mode: 0o600, flag: 'wx' });
  return target;
}

function main() {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const directory = path.resolve(repo, '../work/android-tools/signing');
  const output = path.join(directory, 'bitwarden');
  const restoreIndex = process.argv.indexOf('--restore');
  if (restoreIndex >= 0) {
    const toIndex = process.argv.indexOf('--to');
    if (toIndex < 0 || !process.argv[toIndex + 1]) throw new Error('Informe uma pasta nova de recuperação.');
    const target = restoreSigningBackup(JSON.parse(fs.readFileSync(process.argv[restoreIndex + 1], 'utf8')), process.argv[toIndex + 1]);
    console.log(`Chaves recuperadas em pasta nova e privada: ${target}. Configuração aponta para essa cópia; originais preservados.`);
    return;
  }
  const verifyIndex = process.argv.indexOf('--verify');
  if (verifyIndex >= 0) {
    const files = recoverSigningBackup(JSON.parse(fs.readFileSync(process.argv[verifyIndex + 1], 'utf8')));
    console.log(`Recuperação verificada em memória: ${Object.keys(files).length} arquivos íntegros. Nenhuma chave instalada ou alterada.`);
    return;
  }
  if (process.argv.length > 2) throw new Error('Opção inválida.');
  if (fs.existsSync(output)) throw new Error('Backup já preparado; não será sobrescrito.');
  const files = Object.fromEntries(names.map(name => [name, fs.readFileSync(name === 'debug.keystore' ? path.resolve(directory, '../user/debug.keystore') : path.join(directory, name))]));
  const backup = createSigningBackup(files), recovered = recoverSigningBackup(backup.document);
  if (names.some(name => !files[name].equals(recovered[name]))) throw new Error('A recuperação não corresponde ao original.');
  fs.mkdirSync(output, { mode: 0o700 });
  fs.writeFileSync(path.join(output, 'Financas10-assinatura.f10backup'), backup.envelope, { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(path.join(output, 'Financas10-importar-no-Bitwarden.json'), JSON.stringify(backup.document, null, 2), { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(path.join(output, 'LEIA-ME.txt'), `Backup de assinatura Android — Finanças10\n\n1. No Bitwarden, use Importar dados > Bitwarden (json).\n2. Selecione Financas10-importar-no-Bitwarden.json e importe uma única vez.\n3. Confira ${backup.document.items.length} notas começando por Finanças10 — assinatura. Todas as partes e a nota de recuperação são necessárias.\n4. Confirme a sincronização e abra as notas também em outro dispositivo antes de considerar a cópia externa concluída.\n5. O JSON de importação contém material suficiente para recuperar as chaves. Ele é sensível, mesmo com o conteúdo das partes cifrado. Não envie por chat/email, não coloque no Git. Remova apenas o JSON temporário depois de confirmar o cofre; preserve as chaves originais.\n\nRecuperação futura: exportar somente este conjunto de notas (ou filtrar uma exportação para um único conjunto), então executar: node scripts/signing-backup.mjs --verify CAMINHO_DO_JSON. A rotina verifica e recupera em memória. Para reinstalar a chave em outro computador, um procedimento de restauração deve gravar os arquivos em pasta privada nova e atualizar storeFile na configuração; nunca sobrescrever uma chave existente.\n\nConjunto: ${backup.id}\nArquivos: upload PKCS12, configuração de assinatura, certificado público e chave debug. Nenhum dado financeiro, sessão Google ou credencial Firebase incluído.\n\nReferência: https://bitwarden.com/help/condition-bitwarden-import/\n`, { mode: 0o600, flag: 'wx' });
  console.log(`Backup preparado e recuperação comparada byte a byte. ${backup.document.items.length} notas, até 5.000 caracteres por nota. Pasta privada: ${output}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch { console.error('Não foi possível preparar/verificar o backup de assinatura. Nenhuma chave original foi substituída.'); process.exitCode = 1; }
}
