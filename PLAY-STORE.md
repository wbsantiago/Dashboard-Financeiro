# Sprint 5 — preparação Google Play

**Consolidação de 19/11/2026:** o pacote local atual é **0.7.3 / versionCode 15**. Veja [RELEASE-0.7.3.md](RELEASE-0.7.3.md) para conteúdo, validações e arquivo da entrega. A publicação web/GitHub não publica o aplicativo na Google Play. O plano continua Spark e o serviço automático de exclusão permanece desativado. Os números de versão e resultados das seções abaixo registram a preparação histórica da Sprint 5.

**Atualização após decisão do titular:** manter **Spark gratuito**, com exclusão por atendimento e automação desativada. O Android de distribuição foi cadastrado no mesmo Firebase, com SHA-1/SHA-256 de upload; configuração oficial salva em `android/app/src/release/google-services.json` e ignorada pelo Git. App Firebase: `1:164999356070:android:f7fb06ceef07b6e5319e67`. A versão atual é **0.5.1/versionCode 8**, compilada/assinada e instalada separadamente como **Finanças10**. O Google está habilitado nesse candidato e o teste de entrada com usuário real foi solicitado ao titular; sem envio de cópia local ou teste destrutivo. Consulte [EXCLUSAO-ATENDIMENTO.md](EXCLUSAO-ATENDIMENTO.md) para o processo manual e validações pendentes. O restante deste documento conserva o histórico da preparação 0.5.0 e a alternativa automática futura; **não implantar Functions nem ativar cobrança para esta entrega**.

## Situação em 12/11/2026

**Validação 0.5.1 concluída no aparelho:** o titular confirmou Google no pacote de distribuição, os mesmos lançamentos da conta existente e sessão preservada depois de encerrar/reabrir o processo. APK/AAB assinados verificados; alvo API 36, pacote release, versionCode 8. Os 117 testes, TypeScript, builds web/nativo, lintRelease e prévia do atendimento passaram. A prévia verificou botão de solicitação sem login obrigatório, mailto correto, ausência de chamada automática de exclusão, cópia local preservada e dois temas/três larguras. O app de teste anterior permanece instalado e o hash de seus dados financeiros continuou idêntico. Não houve commit, publicação, exclusão real, envio de e-mail ou implantação de regras/serviços. Permanecem pendentes as validações administrativas/links HTTPS e cadastro/certificados/testes pela Play. A confirmação com a chave de upload não substitui o teste futuro com a assinatura da loja.

**Preparação local implementada; publicação e validação pela loja pendentes.** Não houve cadastro de desenvolvedor, aceite de contrato, ativação de cobrança, implantação de funções/regras, commit/push ou envio à Play.

- Android 0.5.0/versionCode 7, mínimo API 24, alvo API 36.
- Debug: `io.github.wbsantiago.financas10.preview`, Finanças10 Teste; mantém assinatura, login e dados da instalação anterior.
- Release: `io.github.wbsantiago.financas10`, Finanças10; assinatura própria de upload. O namespace Java permanece `.preview` para preservar as classes, com Activity declarada pelo nome completo; não é o identificador público release.
- AAB/APK candidatos em `../work/artifacts/Financas10-Android-Candidato-0.5.0.*`. **Não enviar à produção:** o Firebase release ainda não foi cadastrado e Google está desabilitado nesse candidato. O APK de teste continua com Google configurado.
- Exclusão no app e servidor, páginas públicas, atendimento, declarações e materiais pt-BR preparados. `ACCOUNT_SERVICES.enabled` permanece **false** até implantação/teste real em conta descartável. O app oferece atendimento, sem alegar ter enviado pedido automático.

Finanças10 é nome provisório. Nome público, nome no Android e materiais podem mudar depois; o pacote fica permanente ao cadastrá-lo/publicá-lo na Play. Renomear mantendo pacote, assinatura e Firebase preserva contas e lançamentos.

## Assinatura e build

`node scripts/prepare-android-signing.mjs` cria a chave uma única vez em `../work/android-tools/signing/`, fora do Git, com pasta restrita ao usuário Windows atual. Contém PKCS12, configuração com senha aleatória e certificado público PEM. Recusa sobrescrever arquivos existentes. Guardar cópia **criptografada e separada deste computador**. Nunca enviar chave/senha ao GitHub ou à loja; apenas o certificado público quando solicitado.

Certificado de upload local:

- SHA-1: `8E:82:26:31:E7:78:50:D6:1A:5E:F0:91:F0:BE:C4:F4:63:01:37:53`
- SHA-256: `1B:E1:4E:28:D8:CC:16:01:86:37:51:7C:EB:30:BA:72:FB:AC:09:CF:DD:96:7F:BA:64:E7:BF:D1:32:45:AD:DB`

AAB verificado com jarsigner, APK com apksigner. A chave autoassinada é habitual no Android; o aviso de cadeia não confiável do JAR não indica ausência de assinatura. Play App Signing fornecerá outro certificado de distribuição. Debug, upload, distribuição e compartilhamento interno podem ter certificados diferentes.

```sh
npm test
npm run lint
npm run build
npm run test:services
npm run test:services:emulator
npm run native:bundle
```

`native:bundle` define `FINANCAS10_BUILD_TARGET=release`, recompila a interface, sincroniza Capacitor e executa bundleRelease, assembleRelease e lintRelease. Usa `FINANCAS10_SIGNING_PROPERTIES` ou a pasta padrão acima; nunca assinatura debug para release. Não faz upload. Para retomar o teste, `npm run native:apk` sincroniza novamente sua identidade/configuração.

Arquivos ignorados: `android/app/src/debug/google-services.json`, `android/app/src/release/google-services.json`, `android/local.properties`, chaves e configurações de assinatura. A configuração debug foi movida do antigo `android/app/google-services.json`.

## Firebase de distribuição

1. Cadastrar `io.github.wbsantiago.financas10` no **mesmo projeto** `dashboard-de-financas-pessoais`; adicionar os certificados de upload acima. Isso adiciona uma identidade Android, sem criar outro banco ou migrar contas.
2. Baixar a configuração para `android/app/src/release/google-services.json`. O build confere projeto/pacote/OAuth web. Não editar o arquivo debug para simular outro cadastro.
3. Após configurar App Signing na Play, cadastrar também os certificados de assinatura do app no Firebase e baixar a configuração atualizada. Recompilar; usar versionCode novo se já houve upload. Compartilhamento interno de apps possui certificado próprio; não confundir com faixa de teste interno.
4. Instalar pela Play e validar Google, mesmo UID/dados do site, cancelamento, saída e reabertura. Exclusão somente em conta descartável.

Release e teste são aplicativos separados: arquivos locais privados não migram automaticamente. A mesma conta Google acessará a mesma nuvem após configurar certificados. Para migrar dados locais, exportar/importar com prévia e confirmação.

## Exclusão no servidor — não implantada

Cloud Functions exige plano **Blaze**, com faturamento. Execução, tráfego, build/artefatos, logs e Firestore podem gerar cobrança. Limites de instâncias não são teto financeiro. Revisar custos e configurar orçamento/alertas antes de habilitar. Região proposta: southamerica-east1; conferir a localização do Firestore existente.

O app exige EXCLUIR e reautenticação da mesma conta Google. Cancelar não envia pedido. A callable usa exclusivamente UID do token verificado, exige Google e autenticação com até cinco minutos, e persiste o job em `accountDeletionRequests/{uid}`. Nunca aceita UID do corpo.

As regras usam o job para bloquear leituras/gravações do titular, inclusive sessões antigas. O worker desabilita a conta/revoga sessões, remove recursivamente `users/{uid}` com subcoleções e só então exclui Firebase Auth. Fechar o app não cancela o processo. Cópia financeira local e backups exportados permanecem; o cliente sai e limpa cache Firestore no Android. Falha de limpeza mantém marcador para repetir antes de renderizar a conta.

Worker idempotente, com retry:true. Falhas mantêm job/bloqueio; Auth já removido é tratado como conclusão parcial segura. A janela de novas tentativas é limitada: configurar alertas para jobs não concluídos e erros, acompanhamento e intervenção do responsável. Aceite não significa remoção concluída.

Após concluir, job conserva só UID no caminho, estado, tentativas e datas, sem lançamentos/e-mail. `expiresAt` é programado para 30 dias depois. **Habilitar TTL** nesse campo da coleção antes de ativar cliente. TTL não remove instantaneamente ao expirar; sem configuração não há limpeza automática. Jobs com falha não expiram, evitando liberar recriação antes de concluir.

Sequência quando autorizada:

1. Revisar custos/região/IAM/monitoramento e autenticar CLI oficialmente, sem credenciais no Git.
2. Implantar worker, callable e regras: `firebase deploy --project dashboard-de-financas-pessoais --only functions:account-services,firestore:rules`.
3. Configurar TTL/alertas; validar em conta descartável cancelamento, identidade diferente, fechamento do app, repetição, remoção integral e outra conta intacta.
4. Só então habilitar `src/config/accountServices.ts`, recompilar e publicar páginas/app.

Emuladores usam exclusivamente demo-financas10; teste recusa projeto real ou ausência dos endpoints locais. Valida 551 registros, conta vizinha, UID do corpo ignorado, sessão recente, regras e reentrega. CLI local: instalar com `npm install --prefix ../work/firebase-tools firebase-tools`; dependências: `npm ci --prefix functions`. Novas dependências de serviço/teste foram auditadas sem vulnerabilidades. O app principal mantém avisos herdados de dependências antigas.

## Páginas, contato e loja

Responsável autorizado: **Willian Batista Santiago — willbatista27@gmail.com**. Prévia: `http://127.0.0.1:3000/privacidade.html` e `http://127.0.0.1:3000/excluir-conta.html`. Publicar em domínio HTTPS real e verificar sem login antes de informar links na Play. Não usar localhost, PDF ou endereço inventado. Domínio público não foi definido/verificado nesta entrega.

O atendimento recebe pedidos enquanto a automação está desativada; o responsável deve verificar identidade e atender, pois exibir e-mail não executa exclusão. Rever política, contratos, retenção e procedimento antes do lançamento; os textos não certificam conformidade integral LGPD. Materiais: `store/README.md`, `store/pt-BR/`, `store/DATA-SAFETY.md`; PNGs: `../work/play-store/`.

`npm run release:check` bloqueia prontidão se faltarem Firebase release, serviço ativo, URL HTTPS ou certificados Play verificados. `node scripts/check-play-release.mjs --report` apenas lista pendências. Depois de verificar URLs, definir FINANCAS10_PUBLIC_ORIGIN com o domínio real; FINANCAS10_PLAY_CERTIFICATES_VERIFIED=yes somente após testar login instalado pela loja. Essas variáveis não publicam nem ativam cobrança.

## Cadastro e primeiro teste Play

O titular possui apenas conta Google pessoal, sem cadastro de desenvolvedor. Verificação de identidade/dispositivo, documentos, pagamento e aceite de termos exigem sua participação. Taxa atual indicada pelo Google: US$25 uma vez, a confirmar no fluxo oficial.

1. Criar conta pessoal de desenvolvedor e verificar identidade/dispositivo.
2. Criar app com nome provisório/pacote confirmado e decidir gratuidade com o titular.
3. Configurar App Signing/Firebase, contatos, política/exclusão, classificação, acesso, anúncios, Segurança dos dados e recursos financeiros. Revisar “Outros” nos serviços financeiros de apoio: organização pessoal de orçamento, sem empréstimos, pagamentos, negociação ou bancos conectados. Confirmar opção no formulário vigente; não inventar licenças.
4. Revisores: explicar modo local sem cadastro e login Google. Nunca fornecer a conta Google pessoal do titular para avaliação.
5. Enviar AAB validado à faixa de teste interno, selecionar testadores e revisar relatório de pré-lançamento. Essa distribuição não foi realizada.
6. Nova conta pessoal requer teste fechado com ao menos 12 testadores inscritos por 14 dias consecutivos e posterior solicitação de acesso à produção. Teste interno não substitui essa etapa nem garante aprovação.

## Validação

117 testes JS/TypeScript, sete testes unitários de serviço e integração Auth/Firestore em emuladores passaram. TypeScript, builds web/nativo e lint Android debug/release passaram. Sete testes Android passaram no Moto G75/Android16 após desbloqueio; a falha inicial de rotação ocorreu com tela OFF e keyguard ativo. Teste 0.5.0 atualizado sem desinstalar; hash financeiro antes/depois idêntico.

Prévia conferiu confirmação/cancelamento fictícios, páginas públicas em dois temas/três larguras, backups, offline e responsividade. Assinaturas AAB/APK verificadas. Restam Google do release, serviço implantado em conta descartável e instalação/avaliação pela Play.

Fontes: [assinatura Android](https://developer.android.com/studio/publish/app-signing), [API alvo](https://support.google.com/googleplay/android-developer/answer/11926878?hl=pt-BR), [cadastro Play](https://support.google.com/googleplay/android-developer/answer/6112435?hl=pt-BR), [testes nova conta](https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR), [exclusão](https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR), [recursos financeiros](https://support.google.com/googleplay/android-developer/answer/13849271?hl=pt-BR), [Functions/Blaze](https://firebase.google.com/docs/functions/get-started), [retry](https://firebase.google.com/docs/functions/retries), [TTL](https://firebase.google.com/docs/firestore/ttl).
