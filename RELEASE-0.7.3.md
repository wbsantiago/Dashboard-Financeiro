# Versão consolidada 0.7.3 — 19/11/2026

Esta entrega reúne as implementações locais das versões 0.1–0.7.2 para publicação na `main` e na versão web. O Android usa versionCode 15 e o mesmo pacote/certificado de upload já utilizado. A 0.7.3 corrige o encaixe dos quatro controles do cabeçalho em telas de 320 pixels, mantendo os alvos de toque no celular.

## Conteúdo

- PWA instalável, abertura offline, aviso de atualização e proteção de formulários abertos em outras janelas.
- Aplicativo Android com Capacitor, Google na mesma conta Firebase do site, persistência local e cache separado da conta.
- Exportação, compartilhamento e importação com prévia/confirmação; restauração direcionada somente à cópia local.
- Bloqueio Android opcional por biometria/credencial do sistema, com confirmação direta e tela protegida após cancelamento.
- Vencimento de boleto/Pix, fechamento e vencimento por cartão e escolha explícita do cartão principal para a virada.
- Lembretes locais opcionais no Android e central no sino com histórico e leitura automática dos avisos visíveis.
- Contato público e páginas de privacidade e solicitação de exclusão por atendimento.

O experimento bancário continua separado na branch `bancos`. Não há conexão bancária nesta entrega, publicação na Google Play, implantação de Cloud Functions, ativação do plano Blaze ou alteração remota das regras do Firestore. O atendimento manual de exclusão continua sendo responsabilidade do operador; publicar a página não executa pedidos automaticamente.

## Verificação

Na consolidação: 149 testes do aplicativo e 7 testes unitários dos serviços aprovados; verificação de tipos; compilações web e Android; lint Android; 10 testes unitários da política de bloqueio Android (mais o teste de exemplo do projeto). A auditoria das dependências principais não indicou vulnerabilidades no momento da revisão.

Conferências de interface com dados fictícios e sessões isoladas:

- PWA de produção: manifesto/ícones, instalação/cancelamento, abertura e gravação local offline, atualização adiada/aplicada e formulário preservado em outra janela; dois temas e quatro larguras, incluindo 320 pixels.
- Cartões e vencimentos: escolha/edição do principal, campos do boleto/Pix, cadastro dentro da despesa e atualização dos lembretes ao pagar, reabrir ou alterar a data.
- Sino: leitura somente dos avisos visíveis, leitura ao rolar, persistência após recarregar e histórico de contas pagas; proteção nativa bloqueada simulada impede leitura por trás da tela; dois temas e cinco larguras.
- Backups: exportação, rejeição de arquivo inválido, importação antiga/versionada, prévia, cancelamento, restauração local e preservação da sessão.

As verificações não gravaram dados financeiros de teste na conta real. Chaves de assinatura, senhas, configurações Android locais e arquivos de recuperação do Bitwarden ficam fora do Git. APK/AAB e cópia do código da entrega são arquivados em `../work/releases/0.7.3/`, com hashes e identificação do commit.

## Limites de validação

O usuário confirmou em versões anteriores os dados existentes, login/sessão, biometria e o teste de notificação aparecendo no Android e no sino. A leitura automática da 0.7.2 passou nos testes de interface; sua confirmação manual no aparelho, a conferência de vencimentos reais com o aplicativo fechado e o novo teste de rotação permanecem separados desta consolidação. A 0.7.3 não foi instalada novamente no aparelho nesta etapa.

Também continuam pendentes a confirmação das cinco notas de recuperação no Bitwarden, o teste manual da caixa de atendimento, a validação operacional da exclusão de uma conta descartável e os requisitos futuros de distribuição pela loja. Essas pendências não são apresentadas como concluídas pela publicação web.

Prévia local: `http://127.0.0.1:3000/?demo=2026`. Site: `https://dashboard-financeiro-liart.vercel.app/`.

Detalhes: [Android](ANDROID.md), [PWA](PWA.md), [biometria](BIOMETRIA.md), [lembretes](LEMBRETES.md), [atendimento de exclusão](EXCLUSAO-ATENDIMENTO.md) e [preparação para a Play](PLAY-STORE.md).
