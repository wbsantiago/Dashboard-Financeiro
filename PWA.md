# Mês de Boa como aplicativo instalável

O mesmo projeto React/Vite pode ser instalado pelo navegador e aberto em uma janela independente. O site continua disponível normalmente. Esta documentação descreve o PWA. O APK com Capacitor é uma saída separada, descrita em [ANDROID.md](ANDROID.md); ainda não há publicação nas lojas ou notificações push.

## Instalação

Abra **Configurações → Aplicativo**. Quando o navegador disponibilizar a instalação, o botão **Instalar Mês de Boa** abre a confirmação do próprio navegador. Recusar não impede o uso do site e não grava novas preferências.

- **Android:** Chrome → menu ⋮ → Instalar aplicativo ou Adicionar à tela inicial.
- **iPhone/iPad:** Safari → Compartilhar → Adicionar à Tela de Início. Quando aparecer, ative Abrir como App.
- **Computador:** Chrome/Edge → opção de instalar na barra de endereço/menu. No Safari do Mac, Adicionar ao Dock, quando disponível. O suporte depende do navegador.

O manifesto inicia em `/`, sem parâmetros de demonstração, define idioma português, ícones PNG 192/512, ícone adaptativo e abertura `standalone`. O iOS recebe um ícone opaco de 180 px. A orientação fica livre. As áreas seguras do dispositivo são respeitadas sem bloquear zoom.

## Dados, login e uso sem conexão

O Firebase e as regras de acesso continuam os mesmos. Entrar com a mesma conta Google acessa os mesmos dados da nuvem. Instalar o PWA não copia nem envia automaticamente dados locais.

Alguns sistemas, principalmente o iOS, podem separar o armazenamento do navegador e do aplicativo instalado. Antes de migrar um planejamento exclusivamente local, exporte um backup no navegador original ou envie-o manualmente à conta Google pelo fluxo existente.

Depois da primeira visita bem-sucedida com internet, o service worker guarda **somente arquivos estáticos**: HTML, JavaScript, CSS, fontes e ícones. O painel pode reabrir sem conexão e continuar usando os registros locais já salvos. Não há uma nova fila de sincronização financeira, garantia de dados da nuvem offline ou garantia de login Google sem internet. A interface informa quando está sem conexão.

Não há cache de respostas do Firebase, OAuth, APIs, YouTube ou outros serviços. O fallback de navegação atende somente a raiz e `index.html`, preservando callbacks de autenticação e URLs de arquivos. O PWA não altera os registros financeiros, as sessões ou as escolhas de cookies. A explicação do cache funcional foi acrescentada às informações de armazenamento.

## Atualizações

O build gera um service worker com revisão dos arquivos. Novas versões são verificadas na abertura, ao retornar à janela, ao recuperar conexão e periodicamente. O usuário escolhe **Atualizar e recarregar** ou **Depois**. Salve formulários antes de atualizar.

Somente a janela que pediu a atualização é recarregada automaticamente. Outras janelas não são forçadas a descartar formulários. Se uma versão já tiver sido ativada por outra janela, a interface orienta a salvar e reabrir. Os arquivos antigos de interface são limpos pelo Workbox; os dados financeiros não são apagados.

Na Vercel, `sw.js` e o manifesto usam revalidação de cache. Uma futura publicação web também entrega as atualizações do PWA, sem passar por lojas.

## Desenvolvimento e validação

`npm run dev -- --host 127.0.0.1` mantém a prévia principal na porta 3000, com o service worker desativado para não prender o desenvolvimento em arquivos antigos. Para testar a instalação, use um build de produção:

```sh
npm test
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 3010
```

HTTPS é necessário no endereço publicado; `localhost` e `127.0.0.1` são exceções locais. Um endereço HTTP de rede local aberto no celular não equivale a HTTPS.

Verifique manifesto/ícones, instalação oferecida pelo navegador, janela independente, telas pequenas e temas, recusa da instalação, recarga offline, preservação dos registros, atualização adiada/aplicada com duas janelas, e ausência de respostas financeiras no Cache Storage. iPhone/Android reais devem ser conferidos após publicação; emulação não substitui a confirmação de instalação nos dispositivos.

Referências: [Vite PWA](https://vite-pwa-org.netlify.app/), [instalação de PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
