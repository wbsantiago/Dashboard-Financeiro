# Exclusão por atendimento — Firebase Spark

Escolha do responsável em 12/11/2026: manter o plano gratuito. `ACCOUNT_SERVICES.mode` é `support` e `enabled` é `false`. Não implantar Functions, ativar Blaze, configurar TTL pago ou enviar pedidos automáticos nesta modalidade.

## Caminho oferecido

Configurações → Privacidade → **Solicitar exclusão da conta** abre `excluir-conta.html`. A página identifica app/responsável, o que será removido, as cópias separadas e o atendimento **willbatista27@gmail.com**. O botão de e-mail prepara o assunto, mas não envia nada; o usuário revisa e envia pelo seu aplicativo de e-mail. Há instruções equivalentes para quem já desinstalou o Android.

Publicar a página em HTTPS, conferir sem login e informar esse endereço na Play. O Google admite recurso externo com atendimento por e-mail, desde que permita solicitar exclusão e seja atendido. Isso não certifica aprovação da loja nem adequação integral à LGPD. O plano gratuito do Firebase não elimina a taxa de cadastro da Play Console.

## Procedimento do responsável — só após pedido legítimo

1. Acompanhar a caixa de atendimento; confirmar recebimento e informar prazo/andamento ao titular. Não solicitar senha Google, códigos de autenticação, documento financeiro ou backup como forma de identificação.
2. Verificar que o pedido vem do e-mail ligado à conta e confirmar a intenção por resposta ao endereço cadastrado. Mensagens encaminhadas, nome de exibição ou UID informado no corpo, isoladamente, não comprovam titularidade. Se houver dúvida ou perda de acesso ao e-mail, interromper e usar verificação adequada antes de qualquer remoção.
3. Na **Authentication do projeto correto**, localizar a conta pelo e-mail verificado e conferir o UID. Conferir que é Finanças10, projeto `dashboard-de-financas-pessoais`. Registrar somente o mínimo necessário para acompanhar o pedido.
4. Antes de remover dados, desabilitar a conta no Authentication. Para bloquear imediatamente tokens antigos, publicar/validar previamente a regra que consulta `accountDeletionRequests/{uid}` e criar manualmente esse documento de bloqueio pelo console administrativo. Não criar o documento pelo app. **Nunca ativar o worker automático com esse procedimento sem revisão.** Se a regra de bloqueio ainda não estiver publicada, não declarar remoção protegida contra sessões antigas: aguardar a expiração dos tokens e conferir novamente antes de concluir. Essa condição deve ser testada e resolvida antes de liberar a modalidade na loja.
5. No Firestore, selecionar **somente `users/{UID confirmado}`**. Usar a exclusão recursiva do console, que inclui subcoleções. Conferir explicitamente que `expenses`, `revenues` e quaisquer subcoleções realmente sumiram. Apagar só o documento pelo SDK não remove automaticamente suas subcoleções. Não selecionar a coleção inteira `users` nem outro UID.
6. Somente após confirmar a remoção completa no Firestore, excluir o mesmo usuário em Authentication. Se alguma etapa falhar ou a cota gratuita limitar a operação, manter o acesso bloqueado e retomar; não afirmar conclusão parcial como completa.
7. Depois que tokens antigos não puderem mais ser usados e a conta Auth não existir, remover o marcador técnico de bloqueio manualmente; não depender de TTL no Spark. Revalidar ausência do perfil/subcoleções. Acompanhar erros antes de remover a barreira, nunca liberá-la durante falha parcial.
8. Confirmar a conclusão ao titular. Explicar que sua conta Google continua existindo e que backups exportados/cópias locais de outros dispositivos devem ser removidos por ele. Não anexar lançamentos financeiros à resposta. Definir e informar a retenção mínima da correspondência de atendimento conforme finalidade/obrigações aplicáveis; não guardar cópias financeiras removidas “por precaução”.

As operações administrativas são irreversíveis e precisam de conferência do alvo na hora. Não executá-las para demonstrar a função na conta real do responsável. Não criar nem distribuir chave de serviço como solução para atendimento.

## Validação necessária antes da loja

- Testar recebimento e resposta na caixa autorizada; não foi enviado e-mail de teste automaticamente.
- Executar o procedimento completo em **conta descartável**, incluindo outra sessão ainda autenticada, e conferir outra conta intacta. O teste automático em emuladores da Sprint 5 não substitui essa operação administrativa de atendimento no ambiente publicado.
- Publicar/validar a barreira das regras e verificar acesso por proprietário/outra conta. Essa implantação não está autorizada por cadastrar um aplicativo Android e não foi feita nesta entrega.
- Conferir links HTTPS públicos. Só depois definir `FINANCAS10_SUPPORT_DELETION_VERIFIED=yes` para a verificação de prontidão; a variável não executa nenhuma exclusão.

Fontes: [Google Play — exclusão e recurso externo por e-mail](https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR) e [Firestore — exclusão de documento/subcoleções e console](https://firebase.google.com/docs/firestore/manage-data/delete-data).
