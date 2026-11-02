# Roadmap do projeto

Atualizado em 02/11/2026. Roadmap sem prazos definidos. Foco atual: área de tutoriais; o experimento bancário permanece separado na branch `bancos`.

## Objetivo

Evoluir o aplicativo de controle financeiro pessoal em três frentes: reduzir o trabalho manual, ensinar o usuário a usar o produto e preparar sua divulgação.

## O que já temos implementado

Inventário baseado no código e no README atuais. Não representa uma nova validação em produção.

- [x] Cadastro e edição de receitas e despesas, com categorias e filtros.
- [x] Despesas parceladas e lançamentos mensais recorrentes.
- [x] Cadastro de cartões, controle de despesas por competência e marcação de pagamentos.
- [x] Planejamento mensal de renda, meta de poupança e limites por categoria.
- [x] Visão geral, lançamentos do mês, resumo anual e gráficos financeiros.
- [x] Uso local no navegador e acesso com Google para dados da conta na nuvem.
- [x] Exportação e importação de backups em JSON e envio manual dos dados locais para a conta.
- [x] Temas claro, escuro e automático, opção de ocultar valores e controles de preferências.
- [x] Demonstração local com dados fictícios e seção básica de ajuda nas configurações.

## Metas a implementar

### 1. Automatização com bancos brasileiros — experimento separado

**Objetivo:** reduzir o preenchimento manual de receitas e despesas.

Pesquisa inicial registrada em [Integração com bancos brasileiros](PESQUISA-BANCOS.md), com distinção entre uso pessoal gratuito e integração comercial. Fornecedor e escopo ainda não definidos.

- [ ] Definir quais bancos e quais dados devem entrar na primeira versão: movimentações de conta, saldo e/ou cartão.
- [ ] Estudar a viabilidade da integração via Open Finance e comparar possíveis fornecedores, cobertura, custos e requisitos técnicos.
- [ ] Desenhar o fluxo de conectar banco, autorizar acesso, consultar sincronizações e desconectar.
- [ ] Planejar a infraestrutura e o tratamento seguro dos dados e das autorizações antes da implementação.
- [ ] Implementar um piloto com escopo limitado, definido após o estudo de viabilidade.
- [ ] Tratar duplicidades entre dados importados e lançamentos manuais, inclusive recorrências, parcelas e pagamentos de fatura.
- [ ] Permitir revisar categorias e corrigir os lançamentos importados.
- [ ] Mostrar a última sincronização e explicar falhas ou necessidade de reconexão.

**Primeira entrega:** uma proposta de integração com escopo, custo estimado, dependências e critérios de escolha. A conexão bancária vem depois dessa definição.

**Critério para concluir o piloto:** conectar uma instituição do escopo escolhido, importar movimentações, repetir a sincronização sem duplicar registros e permitir desconexão.

### 2. Área de tutoriais

**Objetivo:** ajudar o usuário a começar e a entender os recursos sem depender de atendimento.

- [x] Criar uma área de tutoriais acessível pelo aplicativo, preparada na versão local.
- [x] Preparar um guia de primeiros passos em texto.
- [x] Explicar receitas, despesas, parcelas, recorrências e cartões nos guias.
- [x] Explicar orçamento, meta de poupança, limites e gráficos nos guias.
- [x] Explicar uso local, conta Google, backups e transferência dos dados nos guias.
- [x] Incluir perguntas frequentes.
- [x] Recomendar um passeio no primeiro acesso e permitir refazê-lo pela ajuda; incluir retorno ao painel pelo logo e nome.
- [ ] Gravar e publicar os vídeos no YouTube e adicionar os links aos guias.
- [ ] Validar o conteúdo com um novo usuário e publicar a central no aplicativo.
- [ ] Adicionar um tutorial de conexão bancária quando a integração estiver disponível.

**Primeira entrega local:** central com sete guias em texto, busca, filtros por assunto, perguntas frequentes e espaços para vídeos do YouTube. Os links de vídeo ainda não foram adicionados. Veja [como organizar e adicionar os vídeos](TUTORIAIS.md).

**Critério de conclusão:** um novo usuário consegue configurar seu planejamento, registrar uma movimentação e salvar um backup seguindo os guias.

### 3. Nome e identidade do aplicativo

**Objetivo:** definir como o produto será apresentado ao público. O código usa atualmente “Finanças10”; o nome definitivo ainda será decidido.

- [ ] Definir o público inicial e a principal promessa do aplicativo.
- [ ] Criar uma lista curta de nomes e escolher os favoritos.
- [ ] Verificar disponibilidade de domínio, nomes de usuário nas redes e possíveis conflitos de marca antes da escolha final.
- [ ] Escolher o nome e definir uma identidade visual básica e uma descrição curta do produto.
- [ ] Planejar a atualização do nome no aplicativo e nos materiais de divulgação.

**Primeira entrega:** lista curta de nomes com justificativas para decidirmos juntos.

### 4. Divulgação: Instagram, TikTok e YouTube

**Objetivo:** começar a apresentar o aplicativo e atrair os primeiros usuários.

- [ ] Definir o papel de cada canal e escolher por qual começar.
- [ ] Após escolher o nome, criar os perfis e organizar suas descrições e identidade visual.
- [ ] Preparar uma demonstração com dados fictícios para gravações.
- [ ] Planejar conteúdos de apresentação do aplicativo, tutoriais e exemplos de organização financeira.
- [ ] Produzir um primeiro lote de conteúdos e definir uma frequência viável de publicação.
- [ ] Acompanhar dúvidas e sugestões dos primeiros usuários para orientar melhorias.

**Primeira entrega:** plano simples de conteúdo e materiais iniciais. Abertura de contas e publicação serão etapas próprias.

## Ordem sugerida para esta etapa

1. **Agora:** revisar a central local de tutoriais e preparar as gravações para o YouTube.
2. **Na sequência:** validar os guias com usuários e trabalhar na escolha do nome.
3. **Quando retomarmos a integração bancária:** continuar o piloto na branch `bancos`, separado do principal.
4. **Com nome e materiais prontos:** iniciar a divulgação. Ela pode começar antes da integração, apresentando apenas os recursos já disponíveis.

Antes de ampliar o uso público, também revisar o canal de atendimento, hoje sem contato configurado, e o fluxo de exclusão da conta e dos dados na nuvem, ainda não implementado.

## Decisões para nossa próxima conversa

- Quais bancos você usa e quer priorizar?
- A primeira automação deve trazer movimentações de conta, cartão ou ambos?
- Quem queremos atender primeiro e qual benefício queremos destacar?
- Mantemos “Finanças10” entre os candidatos ou buscamos um nome novo?
- Qual rede social conseguimos manter com consistência no início?

As entregas locais concluídas estão marcadas acima. Não houve publicação da central, contratação de serviços nem criação de perfis nas redes.
