# Finanças10 Android — Sprints 0 a 5

**Identidade atual — 0.7.4/código 16:** o nome público agora é **Mês de Boa**, com ícone M fluido. Identificadores Android, assinatura e Firebase permanecem iguais; o restante deste documento conserva o histórico das sprints anteriores. Consulte [RELEASE-0.7.4.md](RELEASE-0.7.4.md).


**Versão consolidada em 19/11/2026: 0.7.3 / versionCode 15.** Inclui Google, arquivos/offline, biometria e lembretes, além do ajuste do cabeçalho em telas estreitas. Consulte [RELEASE-0.7.3.md](RELEASE-0.7.3.md) para o estado atual e as pendências de validação. As seções de sprints abaixo preservam as entregas históricas; não indicam a versão atual do APK.

**Decisão atual:** Firebase Spark gratuito e exclusão por atendimento, com Android de distribuição e certificados cadastrados. Configuração release oficial validada; versão **0.5.1/versionCode 8** em preparação. [EXCLUSAO-ATENDIMENTO.md](EXCLUSAO-ATENDIMENTO.md) descreve o processo manual. Não ativar Cloud Functions/Blaze nesta modalidade.

**Resultado 0.5.1:** candidato release instalado como Finanças10, separado do Teste. O usuário confirmou login Google com os dados existentes e sessão preservada após reabertura. A assinatura da Play ainda precisa ser cadastrada/testada quando a loja estiver configurada. Firebase permanece Spark; nada foi publicado.

**Sprint 5:** versão de teste 0.5.0/versionCode 7 instalada e validada, candidato de distribuição assinado preparado e dados preservados. Publicação Play, Firebase release e implantação do serviço de exclusão pendentes. Consulte [PLAY-STORE.md](PLAY-STORE.md) para configuração por variante, assinatura e próximos passos. Os resultados abaixo preservam o histórico das Sprints 0 a 4; o antigo `android/app/google-services.json` agora fica em `android/app/src/debug/google-services.json`.

O Capacitor 8 aproveita a interface React existente e inclui os arquivos do painel no APK. Web/PWA e Android têm saídas separadas (`dist` e `dist-native`). O projeto principal continua em `projeto/`; o experimento de bancos permanece separado.

## Estado desta entrega

- Projeto Android com identificador interno `io.github.wbsantiago.financas10.preview`, nome **Finanças10 Teste**, versão `0.4.0`, Android 7.0/API 24 ou superior.
- Compilação local com Java 21, Android SDK 36 e Capacitor core/android/cli na mesma versão principal.
- Ícones e abertura com a identidade do Finanças10; arquivos da interface e fonte incluídos no APK.
- Modo local com cadastro de entradas/despesas, gráficos e configurações existentes.
- A compilação nativa não inclui service worker ou instalação/atualização do PWA.
- Login Google nativo via Credential Manager e `@capacitor-firebase/authentication`. A credencial Google é entregue ao Firebase JavaScript, que mantém a mesma conta/UID e os mesmos caminhos `users/{uid}` do site.
- Dados locais do navegador e do aplicativo continuam separados. Entrar na conta lê o planejamento existente; a importação da cópia local exige a ação explícita já disponível nas configurações. Sair restaura a cópia local.
- Arquivos gerados e chaves locais são ignorados pelo Git. Não há configurações de lançamento de produção, assinatura para loja ou publicação nesta etapa.

`src/utils/platform.ts` identifica o ambiente nativo. O build verifica `android/app/google-services.json`: projeto igual ao da versão web, pacote Android correto e cliente OAuth web presente. O arquivo local é ignorado pelo Git. Uma compilação sem configuração mantém a interface Google desabilitada; para gerar o APK da Sprint 2, forneça o arquivo cadastrado no Firebase. A versão web mantém seu login por popup.

Validação: **106 testes automatizados**, TypeScript, builds web e nativo, compilação Android e `lintDebug` passaram. Assinatura e identidade da atualização verificadas. A prévia nativa passou no cadastro local/recarga, data noturna em Brasília, ausência de service worker/instalação PWA, três larguras e dois temas. O PWA foi revalidado: instalação, uso offline local, cache apenas estático e atualização sem descartar formulários de outras janelas.

No **Moto G75 5G com Android 16**, a versão 0.2.0 foi instalada sobre a 0.1.0, preservando pacote e assinatura. O usuário confirmou login com a mesma conta e visualização dos dados existentes, além da permanência da sessão após encerrar o processo e reabrir. O usuário também confirmou saída com retorno ao registro local “Teste USB” e cancelamento da escolha de conta sem erro, permanecendo no modo local.

A data sugerida nos formulários e lançamentos rápidos agora usa o calendário local do dispositivo, corrigindo o avanço indevido após 21h em Brasília. Registros anteriores não são alterados.

## Sprint 3 — experiência móvel

- `@capacitor/app` trata o botão/gesto de voltar no Android: fecha a superfície ativa (perfil, configurações, limites, formulários, confirmação, cookies, passeio ou detalhe do gráfico), retorna à visão geral e só então minimiza o aplicativo. Não altera lançamentos. Operações de salvar em andamento consomem o voltar sem desmontar o formulário.
- `useBackHandler` mantém uma ordem de prioridade para que uma única ação não feche duas janelas. A assinatura nativa é removida mesmo se o registro terminar depois da desmontagem/React StrictMode.
- `SystemBars`, incluído no Capacitor 8, acompanha o tema efetivo da interface. Ícones claros no tema escuro, escuros no tema claro; automático continua seguindo o dispositivo. As barras permanecem visíveis.
- O Android usa edge-to-edge e `adjustResize`, com os insets fornecidos pelo Capacitor (incluindo correções para WebViews antigos). Não foi adicionado um segundo plugin para gerenciar o teclado/insets.
- `mobile.css` protege topo, rodapé, janelas, avisos e ação flutuante das barras e recortes do dispositivo. No Android, a altura útil vem do layout da WebView, que o próprio Capacitor redimensiona com o teclado. O navegador usa `visualViewport`. Medidas transitórias inválidas na rotação não substituem a última geometria válida; o deslocamento visual não é reaplicado no Android. O campo focado é revelado apenas pela rolagem interna do diálogo, sem `scrollIntoView` global.
- Configurações têm cabeçalho compacto em telas baixas. A lista de limites usa rolagem única nesse caso, evitando uma lista de altura zero acima do teclado. Edição de lançamentos e confirmações agora têm identificação de diálogo.
- Botões pequenos de fechar, perfil, gráficos e arquivar possuem área de toque de pelo menos 44px. O histórico mantém rolagem vertical por gesto e consulta por toque, e as fatias da pizza continuam mostrando valor e percentual.
- Na prévia isolada com dados fictícios, seis dimensões × dois temas passaram sem rolagem horizontal da página. Formulário, configurações e limites couberam em alturas reduzidas; campos e botões permaneceram acessíveis; o rascunho de nova despesa sobreviveu a mudanças de tamanho e ao fechamento/reabertura do formulário. No teste físico da 0.3.0, o usuário informou que ao girar o cabeçalho apresentava problema e o formulário desaparecia. O usuário confirmou que a 0.3.1 resolveu o desaparecimento do formulário na rotação. Permaneceu uma barra nativa acima do cabeçalho web. A captura e a hierarquia Android mostraram `android:id/action_bar`: `EdgeToEdge.enable` havia criado o decor antes de `BridgeActivity` aplicar o tema sem barra. Na 0.3.2, a inicialização ocorre após `super.onCreate` e os temas inicial/final desabilitam explicitamente a barra de título nativa.

Na validação física da **0.3.2**, o teste `HeaderRotationTest` confirmou ausência de barra nativa na abertura e nas orientações horizontal/vertical. O mesmo teste falhou na 0.3.1, detectando `WindowDecorActionBar`, e passou após a atualização. Dois testes instrumentados Android passaram (cabeçalho/rotação e contexto do pacote), além dos 90 testes JavaScript. A captura final e a hierarquia da tela confirmaram zero barras de título nativas. O aplicativo foi deixado aberto no celular.

Para repetir a verificação nativa, gere os arquivos com `npm run native:sync` e `node scripts/build-android.mjs --test-apk`. Instale a atualização usando `adb install -r`, depois o APK de instrumentação em `android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`. Execute `adb shell am instrument -w -e class io.github.wbsantiago.financas10.preview.HeaderRotationTest,com.getcapacitor.myapp.ExampleInstrumentedTest io.github.wbsantiago.financas10.preview.test/androidx.test.runner.AndroidJUnitRunner`. Esse fluxo não desinstala nem limpa o aplicativo principal; os testes não alteram dados financeiros. Não use tarefas Gradle de testes conectados que desinstalem o aplicativo ao concluir.

Referências da integração: [App API](https://capacitorjs.com/docs/apis/app) e [SystemBars API](https://capacitorjs.com/docs/apis/system-bars).

## Sprint 4 — persistência, offline e arquivos

Em 12/11/2026, a versão **0.4.0 foi instalada por atualização no Moto G75 5G/Android 16**, mantendo pacote, assinatura e dados. Os **sete testes instrumentados passaram no aparelho** (contexto, cabeçalho/rotação e SnapshotStore/arquivos/exportação). A versão instalada foi conferida: versionCode 6. O aplicativo abriu sem erros registrados. A cópia interna foi encontrada e sua impressão digital foi guardada para a conferência de persistência. O usuário confirmou no aparelho: exportação para Downloads, abertura/cancelamento do compartilhamento e importação até a prévia com cancelamento. Após encerramento do processo e abertura a frio, a impressão digital do conteúdo financeiro da cópia local permaneceu idêntica. O usuário também confirmou que o planejamento já carregado apareceu sem internet e que o aplicativo reconectou após reativar a conexão. A validação funcional da Sprint 4 foi concluída.

- **Cópia local nativa:** antes de abrir o painel, o aplicativo compara as revisões da cópia da WebView e do arquivo interno `local-financial-snapshot-v1.json`. Migra a versão anterior sem zerar lançamentos ou categorias. Gravações Android usam `AtomicFile` e uma fila ordenada; uma cópia antiga não substitui uma mais recente. Falhas de gravação ficam visíveis e a cópia da WebView pode reparar o arquivo interno ao reabrir. Se a migração não puder gravar o arquivo interno, a cópia válida da WebView continua acessível para exportação, com aviso; os registros não são bloqueados nem substituídos por valores vazios. As duas cópias são essenciais ao planejamento; não dependem da escolha de preferências opcionais.
- **Recuperação:** se não houver cópia válida, o painel não inicia com dados vazios sobre os arquivos anteriores. A tela de recuperação permite tentar novamente ou escolher um backup, validá-lo e confirmar sua restauração. Apagar a cópia local grava o estado vazio também no arquivo interno; sessão, cookies e dados da conta permanecem separados.
- **Offline:** registros locais podem ser criados e editados sem internet. O Firestore JavaScript usa cache persistente somente no Android; a conta precisa ser carregada completamente pelo menos uma vez no aparelho para consulta offline. Dados incompletos não são apresentados como um planejamento zerado. Edições da conta exigem conexão e carregamento atualizado. Se a conexão cair durante uma gravação já iniciada, o SDK mantém seu comportamento de persistência/reenvio e a interface mostra a pendência; não existe uma segunda fila própria de importação ou envio automático.
- **Retomada:** o componente oficial Network observa mudanças de conexão e consulta novamente o estado ao voltar ao aplicativo. O modo local e os caminhos da conta `users/{uid}` continuam separados. Trocas de conta invalidam callbacks antigos; erros terminais de leitura mantêm as gravações bloqueadas até uma nova assinatura/entrada.
- **Exportação:** Android abre o seletor de destino com `ACTION_CREATE_DOCUMENT`; a confirmação de sucesso ocorre após a gravação do arquivo. Backups maiores são preparados em um arquivo temporário e o estado da Activity guarda apenas seu identificador, evitando incluir o JSON inteiro ao abrir o seletor. O temporário é removido ao concluir ou cancelar; arquivos órfãos com mais de 24 horas são limpos na próxima exportação. A versão web inicia o download de um Blob JSON. O backup contém apenas o planejamento, versão do formato e data de exportação; não inclui sessão, credenciais ou escolhas de cookies.
- **Compartilhamento:** o Android abre sua folha de compartilhamento e o usuário escolhe o aplicativo/destino. O FileProvider expõe apenas `cache/backups/`, sem permissão ampla de armazenamento. Cópias temporárias de compartilhamento com mais de 24 horas são removidas ao preparar outro compartilhamento; o Android também pode limpar seu cache. Arquivos que o usuário salvar fora do aplicativo permanecem no destino escolhido.
- **Importação:** aceita o JSON antigo e o formato versionado. Arquivos até 10 MB passam por validação de estrutura, datas, valores finitos, identificadores repetidos e recorrências. Exibe nome, quantidades e destino antes da confirmação. Cancelar não altera dados. A restauração **sempre se aplica à cópia local**, mesmo conectado ao Google. O envio à conta permanece uma ação manual separada, com confirmação do destino.
- **Correções de compatibilidade:** a ausência da categoria Presentes não provoca mais uma limpeza do histórico; valores zero de renda/metas e a indicação da primeira parcela no mês seguinte são preservados nos backups.

Validação local: 106 testes JavaScript e TypeScript passaram, incluindo migração, reinício, ordem de gravação, falta de espaço simulada, arquivos inválidos, recuperação e separação local/nuvem. A interface foi testada com exportação real, prévia/cancelamento/confirmação de importação, criação local sem internet, recarga e reconexão. Builds web/nativo, `assembleDebug`, `lintDebug` e compilação de `:app:assembleDebugAndroidTest` passaram. O PWA passou novamente em instalação, abertura offline, cache apenas de arquivos estáticos e atualização sem descartar formulários de outra janela. A prévia nativa passou em três larguras e dois temas, criação/recarga de registros locais, ausência de service worker e ausência de erros de execução. A assinatura debug foi verificada e a interface no APK corresponde à compilação final.

Os **sete testes instrumentados disponíveis** cobrem contexto do aplicativo, cabeçalho/rotação e cinco casos do SnapshotStore/seletor de documentos/exportação. Na validação física da Sprint 4, todos os sete passaram. Use o fluxo manual de instalação acima, acrescentando `io.github.wbsantiago.financas10.preview.SnapshotStoreTest` à lista de classes; ele não apaga a aplicação nem cria registros financeiros reais.

APK final: `../work/artifacts/Financas10-Android-Teste-0.4.0.apk`, pacote `io.github.wbsantiago.financas10.preview`, versionCode `6`. SHA-256: `8F38327248A828ABF13B81FC7ADE25E9C4FBC329BC933584EC3D5BB815A1614D`. Sem commit, push ou deploy nesta entrega.

### Roteiro de conferência no celular

1. Instalar o APK 0.4.0 **por cima** da versão existente (mesmo pacote e assinatura), sem desinstalar nem apagar dados.
2. Conferir registros anteriores; criar um lançamento fictício no modo local, fechar/reabrir e repetir sem internet.
3. Em Configurações → Dados e backups, exportar para uma pasta escolhida. Abrir Compartilhar e cancelar sem enviar a terceiros.
4. Selecionar o arquivo exportado em Importar; conferir a prévia, cancelar e verificar que os dados foram mantidos. Confirmar somente se desejar restaurar a cópia local.
5. Conectar a mesma conta Google, aguardar o carregamento, consultar offline após reabrir e reconectar. Não usar a conta real para testes automáticos de gravação.

**Resultados registrados em 12/11/2026:** os sete testes instrumentados passaram; os fluxos de exportação, compartilhar/cancelar e importar/prévia/cancelar foram confirmados pelo usuário; o reinício a frio manteve o hash da cópia local; a consulta do planejamento já carregado sem internet e a reconexão foram confirmadas pelo usuário. Não houve restauração sobre os dados reais, envio de backup a terceiros ou gravação financeira automática na nuvem durante essa conferência. Os testes de restauração confirmada e falha de gravação usaram dados fictícios em ambiente isolado.

Registros locais de verificação: `../work/sprint4-android-tests.txt`, `../work/sprint4-local-before.json` e `../work/sprint4-local-after.json`. Os dois últimos contêm somente versão/revisão e hash, sem valores ou lançamentos.

Referências: [documentos no Android](https://developer.android.com/training/data-storage/shared/documents-files), [cache offline do Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline) e [Share do Capacitor](https://capacitorjs.com/docs/apis/share).

## Autenticação e proteção dos dados

A versão local **0.7.2** inclui [lembretes de vencimento](LEMBRETES.md), preparados no próprio aparelho com `@capacitor/local-notifications`. Não usa push, faturamento Firebase ou alarmes exatos; requer autorização de notificações e mantém texto genérico na tela bloqueada. As preferências por conta/aparelho usam `@capacitor/preferences` e não integram o backup financeiro.

Na versão local **0.6.1**, o [bloqueio opcional pelo Android](BIOMETRIA.md) abre diretamente a confirmação de biometria ou credencial do aparelho. Configuração, dados tratados, limitações e resultados dos testes estão documentados no link. Essa proteção local é independente do login Google descrito abaixo.

- `skipNativeAuth: true`: o plugin obtém o ID token Google sem criar uma segunda sessão Firebase nativa. `signInWithCredential` autentica o SDK JavaScript já usado pelo Firestore.
- A sessão JavaScript persiste em IndexedDB. O aplicativo não grava tokens manualmente no armazenamento financeiro, URLs ou logs.
- Sair encerra primeiro a sessão JavaScript, depois limpa o estado do provedor Google. Não remove a conta, seus registros na nuvem ou a cópia financeira local.
- Mudanças de UID limpam a cópia em memória antes de carregar a conta seguinte. Callbacks antigos são ignorados após troca de conta ou cancelamento da assinatura.
- Login não envia lançamentos locais. A criação de um perfil padrão continua condicionada à confirmação de ausência no servidor e à nova verificação em transação; nunca substitui perfil existente.
- O Android de teste está registrado no projeto Firebase já usado pelo site, com o SHA-1 da assinatura debug local. Uma assinatura de distribuição/Google Play exige cadastrar os certificados correspondentes antes do lançamento.
- Regras do Firestore, contas existentes e configuração do provedor Google web não foram modificadas.

## Compilar

```sh
npm install
npm test
npm run lint
npm run native:apk
```

`native:apk` recompila os arquivos nativos, sincroniza o projeto Android, executa `assembleDebug` e `lintDebug` e copia o APK para `../work/artifacts/Financas10-Android-Teste-0.4.0.apk`.

O script procura Java/SDK nas variáveis `JAVA_HOME` e `ANDROID_HOME` ou nas ferramentas locais em `../work/android-tools/`. Ele não instala ferramentas automaticamente. Com Android Studio instalado, configure esses caminhos normalmente. Nesta máquina, o Java e o SDK de compilação foram preparados dentro de `work/`, sem alterar o PATH global. O Gradle e seu cache também ficam fora do repositório.

Para trabalhar pelo Android Studio, use `npm run native:android`. Para sincronizar sem gerar APK: `npm run native:sync`. A prévia web do pacote nativo usa `npm run preview:native`, na porta 3011; ela ajuda a conferir a interface, mas não substitui instalação e testes em Android real.

## Instalar e avaliar no Android

1. Transfira o APK de teste para seu aparelho e abra-o.
2. Se o Android solicitar, permita instalar **esse APK** pelo aplicativo usado para abri-lo. A permissão pode ser revogada depois.
3. Procure **Finanças10 Teste**. Pelo perfil, conecte a mesma conta Google do site e confira os registros existentes.
4. Cadastre uma entrada e uma despesa fictícias. Navegue pelos meses, gráficos e configurações.
5. Feche e reabra o aplicativo; os registros locais devem continuar disponíveis.
6. Confira saída, retorno à cópia local e cancelamento da escolha de conta. O uso local funciona sem internet; entrar e confirmar alterações na nuvem requer conexão. A validação física de teclado, rotação e voltar faz parte da Sprint 3. Persistência e arquivos da Sprint 4 estão implementados; a versão 0.4.0 foi instalada e validada no aparelho, incluindo seus sete testes Android, arquivos, persistência e retomada offline/reconexão.

O protótipo possui identidade separada para não substituir outros aplicativos. Desinstalá-lo apaga seus dados locais. Uma atualização precisa preservar identificador e assinatura para atualizar o mesmo aplicativo; a assinatura debug fica nas ferramentas locais e não deve ser enviada ao GitHub. A identidade definitiva e a chave de distribuição serão definidas antes da publicação na loja; o cadastro Firebase atual é do aplicativo de teste.

## Próximas sprints

| Sprint | Entrega | Critério |
| --- | --- | --- |
| 0 | Ambiente e saídas web/nativa separadas | Java/SDK configurados; build web preservado |
| 1 | APK com modo local | Compilação, assinatura e verificação do pacote; instalação e avaliação no aparelho do usuário |
| 2 | Google e mesmo Firebase | Mesma conta/UID e registros existentes; cancelamento, saída e retomada; sem importação automática |
| 3 | Experiência móvel | Teclado, áreas seguras, botão de voltar, orientação, temas e gráficos no aparelho |
| 4 | Persistência e arquivos | Reinício, atualização, offline/reconexão, backup/importação/compartilhamento |
| 5 | Preparação Google Play | Pacote assinado de distribuição, exclusão de conta/dados, privacidade, declarações e testes da loja |
| 6 | iOS | Compilação em Mac/serviço compatível, autenticação e validação em iPhone/TestFlight |

Publicações e alterações de contas/serviços externos seguem como etapas específicas; gerar um APK local não publica o aplicativo. A conexão bancária e novas funcionalidades nativas não fazem parte desta primeira entrega.
