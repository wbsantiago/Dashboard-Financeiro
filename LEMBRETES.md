# Vencimentos e lembretes — Android 0.7.2

As alterações permanecem locais. O APK foi instalado por atualização no aparelho de teste, com o mesmo pacote e certificado da versão anterior; não houve commit, publicação na loja ou deploy web.

## Cartões e virada

Em **Configurações → Orçamento do mês → Cartões e virada do mês**, cada cartão tem apelido, quatro últimos dígitos, fechamento e vencimento (1–31). É possível editar os cartões já cadastrados e escolher explicitamente **Usar como principal**. O cadastro feito dentro de uma nova despesa também pede as duas datas.

Somente o **fechamento do cartão principal** orienta a virada do painel e a competência dos novos lançamentos. Até o dia do fechamento, o controle permanece no mês anterior; no dia seguinte, avança. Alterar o principal ou seu fechamento faz o painel voltar a acompanhar a regra atual, inclusive ao alterar de 3 para 6 e depois retornar a 3. As datas e competências já gravadas nos lançamentos são preservadas.

Sem um principal válido, o aplicativo mantém a configuração anterior de virada, inclusive ajustes mensais históricos. Nenhum cartão existente é escolhido automaticamente. Retirar o principal ou removê-lo do cadastro volta à regra anterior, sem apagar os lançamentos.

O **vencimento das faturas** é independente da virada. Para cada compra pendente, o lembrete usa a data da compra/ocorrência e o fechamento do próprio cartão: até o fechamento, considera a fatura que fecha naquele mês; depois, a que fecha no próximo. O vencimento fica após esse fechamento; um dia de vencimento menor ou igual ao fechamento pertence ao mês seguinte. Exemplo: fechamento 3 e vencimento 10; compra em 03/11 vence em 10/11, e compra em 04/11 vence em 10/12. O cálculo não consulta bancos e não ajusta feriados/dias úteis.

Faturas são agrupadas por identificador do cartão e vencimento, somando somente os lançamentos pendentes. Compras antigas sem ID podem usar os últimos dígitos apenas quando há um único cartão correspondente. Cartões removidos, ambíguos ou sem datas não recebem um vencimento inventado. A competência do painel e o vencimento da fatura são informações diferentes; uma fatura pode reunir lançamentos de mais de um mês do painel.

## Boleto e Pix

- Nova despesa ou edição por **boleto**: campo obrigatório **Vencimento do boleto**.
- **Pix**: vencimento opcional, para contas com prazo. Pix imediato pode continuar sem data de vencimento.
- O vencimento é separado da data do lançamento e aparece na lista de despesas.
- Nas recorrências e novas parcelas, o vencimento avança a cada mês. O dia 31 é ajustado ao último dia de fevereiro e retorna ao dia original em março.
- Editar esta e as próximas recorrências desloca o vencimento das ocorrências seguintes; os meses anteriores permanecem preservados.
- Os dados antigos não recebem vencimentos automaticamente. Não há consulta nem confirmação de pagamento bancário.

## Onde aparecem

O painel tem a área recolhível **Vencimentos e pendências**, com contas em atraso e vencimentos dos próximos 30 dias, independentemente do mês selecionado. Mostra o saldo pendente, respeitando ocultar valores, e oferece acesso ao mês dos lançamentos. **Configurações → Lembretes** concentra a autorização e as preferências de notificações.

As notificações do Android são opcionais e começam desativadas. A central interna continua disponível mesmo sem autorização de notificações. Ao ativar, o usuário autoriza notificações no sistema. Pode escolher somente no vencimento ou também 1, 3 ou 7 dias antes, e um horário aproximado (padrão 09:00). Há um resumo discreto por dia, sem nomes, valores, descrições ou identificadores da conta. Tocar no aviso abre a central do sino; a proteção biométrica continua sendo aplicada.

São agendados até 90 dias de avisos, renovados quando o aplicativo abre, retoma ou atualiza os dados. Marcar como pago, excluir ou mudar um vencimento reconcilia os agendamentos; avisos já entregues não são repetidos ao abrir novamente. O app não cria retrospectivamente uma notificação cujo horário já passou naquele dia; a pendência continua visível no painel. Um aviso já agendado para hoje é mantido até o fim do dia quando o sistema atrasa sua entrega.

Os lembretes usam o planejamento carregado neste aparelho. Alterações feitas em outro dispositivo precisam sincronizar aqui. As preferências de notificação ficam neste Android, separadas por conta/modo local, fora do backup financeiro e do Firebase. Trocar a origem dos dados limpa os agendamentos antigos antes de preparar os próximos. Não há envio de e-mail, serviço de push, servidor pago ou mudança no plano Firebase.

O agendamento é aproximado e dispensa permissão especial de alarmes exatos. Economia de bateria, aparelho desligado, bloqueio de notificações, restrições do Android ou encerramento forçado podem impedir/atrasar avisos. Os receivers do plugin restauram agendamentos após reinício quando o sistema permite. O navegador/PWA mostra as pendências no painel; esta entrega não agenda notificações em segundo plano na web.

## Central de avisos no sino

O sino do cabeçalho mostra o contador de não lidos. A central adiciona avisos quando um vencimento está próximo ou atrasado, independentemente da permissão de notificações do Android. Ao abrir, os avisos visíveis são marcados automaticamente como lidos; ao rolar, os demais são marcados conforme aparecem. Avisos fora da área visível permanecem não lidos. A leitura automática espera o desbloqueio da proteção nativa e a página visível. Marcar como lido não marca uma conta como paga.

Avisos de contas posteriormente pagas permanecem no histórico, com indicação de pagamento. Cada conta pode ter um aviso prévio e outro de vencimento; reabrir a central não gera duplicatas. Contas excluídas ou com vencimento alterado atualizam as referências. Há até 80 avisos, retidos por até 90 dias. Só identificadores/referências e datas de criação/leitura são guardados no dispositivo, separados por conta e modo local; títulos/valores são consultados no planejamento em uso. Essa lista não entra no backup nem é enviada ao Firebase. No navegador usa armazenamento local; no Android usa preferências privadas. A demonstração mantém tudo em memória.

O botão **Testar notificação** publica um aviso imediatamente, sem aguardar a janela de alarmes aproximados, e registra uma referência genérica de teste na central. Essa referência confirma a solicitação do envio; não declara, por si só, que o sistema exibiu o aviso.

## Arquivos e verificação

- `src/types.ts`, `src/utils/storage.ts`, `src/App.tsx`: campos opcionais compatíveis com os registros antigos, carga/salvamento na nuvem e backup.
- `src/utils/paymentDates.ts`: cartão principal, associação de cartão e datas de fatura.
- `src/utils/recurrence.ts`: vencimentos de recorrência e edição futura.
- `src/utils/reminders.ts`: pendências e planejamento dos avisos por dia.
- `src/utils/reminderNotifications.ts`, `src/hooks/usePaymentReminders.ts`: autorização explícita, preferências por conta/aparelho, agendamento serializado e descarte de atualizações antigas.
- `src/components/CardSettings.tsx`, `ExpenseTracker.tsx`, `PaymentReminders.tsx`: formulários e visualização.
- `src/utils/reminderInbox.ts`, `src/components/ReminderInbox.tsx`: referências de histórico, contador e leitura automática dos avisos visíveis.
- `android/app/src/main/AndroidManifest.xml`: remoção da permissão especial de alarme exato trazida pelo plugin; `drawable/ic_stat_reminder.xml`: ícone do aviso.
- `src/legal.tsx`: transparência sobre as datas e notificações locais.

Verificações: **149 testes TypeScript** aprovados, incluindo os fluxos reais de criação/edição local e nuvem com armazenamento simulado, datas de faturas, mês curto, recorrência, parcelas, backup, permissão negada, não duplicação e troca de origem durante um agendamento. A interface real passou com dados fictícios em dois temas e quatro larguras: principal/edição, vencimento obrigatório de boleto, Pix sem vencimento, alteração de data, pago/pendente e cadastro de cartão dentro da despesa. Os testes de interface não gravaram dados financeiros nem acessaram contas reais. Compilações web e Android e verificações de tipos/lint aprovadas; assinatura conferida antes da atualização. Android 0.7.2: versionCode 14.

O usuário confirmou os dados preservados após instalar a 0.7.0 e confirmou na 0.7.1 o teste aparecendo tanto na barra do Android quanto no sino. A leitura automática da 0.7.2 foi conferida na interface real com 12 avisos fictícios: somente os visíveis são lidos, a rolagem lê os seguintes, a leitura persiste após recarregar e a proteção nativa bloqueada (simulada no teste) impede leitura por trás da tela de bloqueio. Dois temas e cinco larguras (320–1440) passaram. A leitura automática ainda não foi confirmada manualmente no aparelho; outras marcas e versões do Android não foram testadas fisicamente.

Referências: [notificações locais do Capacitor 8](https://capacitorjs.com/docs/apis/local-notifications), [permissão de notificações do Android](https://developer.android.com/develop/ui/views/notifications/notification-permission), [agendamento de alarmes no Android](https://developer.android.com/develop/background-work/services/alarms/schedule).
