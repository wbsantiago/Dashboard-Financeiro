import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pending = [];
const configPath = path.join(repo, 'android/app/src/release/google-services.json');
const web = JSON.parse(fs.readFileSync(path.join(repo, 'firebase-applet-config.json'), 'utf8'));
if (!fs.existsSync(configPath)) pending.push('Cadastrar o Android de distribuição no Firebase e salvar src/release/google-services.json.');
else {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const client = config.client?.find(c => c.client_info?.android_client_info?.package_name === 'io.github.wbsantiago.financas10');
  if (config.project_info?.project_id !== web.projectId || !client?.oauth_client?.some(c => c.client_type === 3)) pending.push('Corrigir projeto/pacote/cliente Google no arquivo Firebase de distribuição.');
}
const services = fs.readFileSync(path.join(repo, 'src/config/accountServices.ts'), 'utf8');
if (/mode:\s*'support'/.test(services)) {
  if (process.env.FINANCAS10_SUPPORT_DELETION_VERIFIED !== 'yes') pending.push('Validar recebimento, verificação de identidade e remoção manual completa em conta descartável pelo atendimento.');
} else if (!/enabled:\s*true/.test(services)) pending.push('Publicar e validar o serviço de exclusão e as regras; habilitar ACCOUNT_SERVICES somente depois.');
if (!/responsibleName:\s*'[^']+'/.test(fs.readFileSync(path.join(repo, 'src/config/appContact.ts'), 'utf8'))) pending.push('Identificar o responsável público.');
const origin = process.env.FINANCAS10_PUBLIC_ORIGIN;
try { const url = new URL(origin); if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.pathname !== '/') throw Error(); }
catch { pending.push('Informar FINANCAS10_PUBLIC_ORIGIN com o endereço HTTPS real das páginas públicas e validar os links online.'); }
if (process.env.FINANCAS10_PLAY_CERTIFICATES_VERIFIED !== 'yes') pending.push('Cadastrar os certificados de assinatura da Play no Firebase e validar login na versão instalada pela loja.');
if (pending.length) {
  console.log('Candidato local: ainda não enviar para produção.');
  for (const item of pending) console.log(`- ${item}`);
  process.exitCode = process.argv.includes('--report') ? 0 : 1;
} else console.log('Pré-requisitos locais conferidos. A revisão dos formulários e o teste pela Google Play continuam obrigatórios.');
