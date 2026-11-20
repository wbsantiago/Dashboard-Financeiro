# Proteção local no Android — 0.6.1

Em **Configurações → Privacidade → Proteção no celular**, o usuário pode ativar o bloqueio do aplicativo instalado. A opção começa desativada. Ativar, desativar e mudar o intervalo exigem confirmação pelo próprio Android.

## Desbloqueio

- Ao abrir um novo processo com a proteção ativa, a confirmação do Android aparece diretamente, sem uma pergunta intermediária.
- Android 11 ou superior: biometria forte ou PIN, padrão ou senha do celular. Android 7–10: confirmação do bloqueio do celular pelo sistema.
- Ao voltar de outro aplicativo, o intervalo escolhido determina se é necessário autenticar: imediatamente, 30 segundos (padrão), 1 minuto ou 5 minutos. Apagar a tela bloqueia imediatamente.
- A confirmação automática aguarda o celular estar desbloqueado e a janela do aplicativo estar em primeiro plano.
- Cancelar mantém a tela protegida e oferece **Tentar novamente** ou sair do aplicativo. Não há novas confirmações automáticas em sequência na mesma sessão bloqueada.
- Se o aparelho deixar de ter um bloqueio de tela configurado, o aplicativo permanece protegido e oferece abrir as configurações de segurança do Android.

## Dados e limites

A confirmação é feita pelo Android; o aplicativo não recebe a digital, o PIN ou a senha. Só a decisão de ativação e o intervalo ficam nas preferências privadas nativas (`financas10_app_lock_v1`). Não são enviados ao Firebase nem incluídos no backup financeiro. O bloqueio não altera o login Google nem transfere, apaga ou restaura lançamentos.

Uma tela nativa opaca cobre a interface enquanto bloqueada ou em segundo plano; o conteúdo coberto também é retirado da navegação por acessibilidade. Com a proteção ativa, `FLAG_SECURE` impede capturas/gravações de tela e protege a miniatura de aplicativos recentes. O bloqueio não adiciona criptografia aos arquivos financeiros exportados nem substitui a segurança do aparelho. O navegador/PWA não oferece este bloqueio nativo.

## Implementação

- `android/app/src/main/java/io/github/wbsantiago/financas10/preview/AppLockController.java`: confirmação do sistema, proteção da janela e eventos do Android.
- `AppLockState.java`, no mesmo diretório: política de bloqueio e repetição da confirmação.
- `AppLock.java`, no mesmo diretório, e `src/utils/appLock.ts`: ponte de configurações; não expõem uma operação de desbloqueio por JavaScript.
- `src/components/AppLockSettings.tsx`: configuração e tratamento de cancelamento.
- `src/legal.tsx`: transparência sobre a proteção local.

## Verificação local

Na versão 0.6.1 (versionCode 11): 125 testes TypeScript aprovados; 10 testes da política Android aprovados; lint TypeScript, compilação web, compilação Android e lint Android aprovados. A assinatura do APK confere com a chave de distribuição existente. A instalação foi feita por cima, sem desinstalar nem limpar dados.

O usuário confirmou no Moto G75/Android 16 a ativação na 0.6.0 e, na 0.6.1, a abertura direta da confirmação e a preservação dos seus dados. Também confirmou que cancelar mantém os dados escondidos sem repetir a confirmação e que **Tentar novamente** permite desbloquear.

A interface também foi conferida isoladamente com dados fictícios e respostas nativas simuladas: espera pela confirmação, cancelamentos sem alteração de estado, intervalos, dois temas e quatro larguras, além do navegador real exibindo indisponibilidade. Essa simulação não substitui o teste de biometria no aparelho. Android 7–10 e outras marcas de aparelho não foram validados fisicamente.

As alterações permanecem locais, sem commit, publicação na loja ou deploy web.
