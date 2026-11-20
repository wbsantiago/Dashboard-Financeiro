# Segurança dos dados — preparação, não formulário enviado

**Decisão atual:** versão 0.5.1 no plano gratuito Spark, com exclusão por atendimento. Cloud Functions/worker/TTL não foram ativados. O registro técnico automático de 30 dias abaixo descreve somente a alternativa futura, não o tratamento ativo desta modalidade. Rever a declaração final com [EXCLUSAO-ATENDIMENTO.md](../EXCLUSAO-ATENDIMENTO.md), após validar o atendimento e publicar os links HTTPS.

Base: código principal da versão 0.5.0. O experimento `projeto-bancos/` não está incluído. Responsável deve revisar as respostas no formulário vigente e conferir a lista final de SDKs/serviços e os termos do Firebase. O comportamento opcional também precisa ser declarado; não responder “nenhum dado coletado” porque há um modo local.

| Informação | Uso no código | Preparação da declaração |
| --- | --- | --- |
| Nome, e-mail e identificador Google/Firebase | `src/utils/authentication.ts`, `src/components/AccountMenu.tsx` | Informações pessoais; gerenciamento de conta e funcionamento; conexão Google opcional |
| Foto do perfil | AccountMenu exibe `photoURL` do usuário | Revisar a classificação aplicável a foto de perfil e o carregamento pela infraestrutura Google; não omitir por não haver upload próprio |
| Entradas, gastos, renda, metas, cartões/apelidos, histórico | `users/{uid}`, `expenses`, `revenues` via App.tsx | Informações financeiras (histórico de compras e outras informações financeiras conforme o formulário); funcionamento; opcional escolher modo local |
| Descrições e categorias livres | Campos dos lançamentos | Podem conter conteúdo pessoal e informações financeiras; explicar finalidade e orientar não incluir senhas/dados de terceiros |
| IP e metadados técnicos do SDK/serviço | Autenticação/infraestrutura Firebase/Google | Revisar divulgações específicas do SDK realmente utilizado, inclusive prevenção de fraude/segurança; não equivale a coleta de GPS |
| Backup JSON compartilhado pelo usuário | `backupFiles.ts`, DeviceFiles e Share | Exportação/compartilhamento por ação explícita para o destino escolhido; aplicar corretamente a exceção de compartilhamento iniciado pelo usuário |
| Vencimentos e cartão principal (0.7.2) | Planejamento e `paymentDates.ts` | Integram os dados financeiros no modo de armazenamento escolhido; entram no backup. Não há integração bancária |
| Histórico interno de avisos e estado de leitura (0.7.2) | `reminderInbox.ts`, `ReminderInbox.tsx` | Referências aos lançamentos e datas de criação/leitura, mantidas no aparelho por conta/modo local; sem duplicar nomes/valores, sem envio ao Firebase e fora do backup financeiro |
| Preferências e agendamentos de lembretes locais (0.7.2) | `reminderNotifications.ts`, Capacitor LocalNotifications/Preferences | Mantidos no Android, separados por conta/modo local; sem envio ao servidor. Texto de notificação genérico, sem dados financeiros ou identificação de conta |
| Proteção opcional do aplicativo Android (0.6.1) | AndroidX Biometric/credencial do sistema, `AppLockController.java` | Digital/PIN/senha permanecem sob controle do Android; o app recebe somente o resultado. Ativação e intervalo ficam nas preferências privadas do aparelho, sem envio ao Firebase ou ao backup financeiro. Rever a declaração da versão final, sem classificar esse fluxo como upload de biometria |
| Identificador técnico, datas e estado da exclusão | Functions, quando habilitadas | Gerenciamento da solicitação/segurança; sem lançamentos; expiração programada após 30 dias da conclusão |

Não há Analytics, Crashlytics, publicidade, câmera, microfone, contatos, localização por GPS ou integração bancária no app principal. O manifest mesclado solicita Internet, estado da rede e permissões técnicas dos SDKs; arquivos são selecionados pelo usuário, sem permissão ampla para ler armazenamento. A existência de uma biblioteca no APK não permite ignorar eventual comportamento automático: conferir suas divulgações e o grafo final de dependências.

Google/Firebase atuam como infraestrutura e autenticação. A classificação de “compartilhamento” na Play tem exceções para prestadores de serviço e transferências iniciadas pelo usuário; revisar os contratos/configuração antes de marcar a resposta. “Não vendemos dados” não é sinônimo de “nenhum terceiro processa dados”. Não há venda de dados implementada.

- Trânsito para a nuvem: HTTPS; isso **não é criptografia de ponta a ponta**. Backups exportados são JSON legível.
- Exclusão: há caminho de atendimento no app e página externa; o serviço automático está **desativado até implantação e teste em conta descartável**. Não declarar automação ativa enquanto a configuração estiver `false`.
- Páginas externas: publicar `privacidade.html` e `excluir-conta.html` em HTTPS e verificar sem login, inclusive no celular. A página de exclusão deve continuar funcionando sem instalação do Android.
- Permissões sociais: Google é o único provedor de login. Não confundir o uso de tokens de sessão com coleta de senha Google.

Referências: [formulário Segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469?hl=pt-BR), [divulgação dos SDKs Android Firebase](https://firebase.google.com/docs/android/play-data-disclosure), [privacidade Firebase](https://firebase.google.com/support/privacy) e [requisitos de exclusão de conta](https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR).
