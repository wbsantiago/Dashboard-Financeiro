# Pesquisa: integração com bancos brasileiros

Consulta em 01/11/2026. Pesquisa documental; nenhuma conta bancária foi conectada e nenhum serviço foi contratado. Preços e condições precisam ser reconfirmados na contratação.

## Conclusão para o projeto

A alternativa gratuita lembrada na conversa anterior é o **Meu Pluggy**, voltado à leitura dos próprios dados. A documentação atual explicita uso pessoal, até cinco conexões e ausência de uso comercial. Para um produto com outros usuários, indica a integração comercial. Portanto, não devemos planejar a oferta pública do dashboard contando com cinco conexões gratuitas para cada usuário. [Guia oficial de uso pessoal](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use).

São duas validações diferentes: experimentar os próprios dados em uma ferramenta pessoal e desenvolver a integração que será oferecida aos usuários do produto. O protótipo pessoal não valida as condições comerciais da segunda.

## Comparação inicial

| Caminho | Condições encontradas | Aplicação nesta etapa |
| --- | --- | --- |
| Meu Pluggy | Gratuito; cinco conexões ativas por titular; sem SLA ou contrato comercial; sem categorização automática | Experimento estritamente pessoal |
| Pluggy Dados | A partir de R$ 2.500/mês, até 500 conexões ativas; teste em produção de 15 dias | Candidato à integração do produto |
| Belvo | Sandbox gratuito; Launch anunciado por R$ 1.500/mês, sujeito a restrições de segmento | Alternativa comercial a avaliar com a fornecedora |

Fontes: [preços da Pluggy](https://www.pluggy.ai/precos), [preços da Belvo](https://belvo.com/pt-br/planos-precos/).

O plano de Pagamentos da Pluggy, anunciado a partir de R$ 500/mês, é outro produto e não substitui o plano de Dados para importar compras. A cobrança por excedente, o volume de requisições incluído e a frequência de atualização precisam ser detalhados na proposta comercial. [Condições da Pluggy](https://www.pluggy.ai/precos).

A Belvo informa que produção exige plano pago e restringe o Launch a segmentos como crédito, bancos, pagamentos e fintechs. Precisamos confirmar se este aplicativo de finanças pessoais se enquadra e o que está incluído no preço. [Condições da Belvo](https://belvo.com/pt-br/planos-precos/).

## Como funciona o gratuito

1. O titular cria conta no Meu Pluggy e conecta seus bancos por lá.
2. No Dashboard da Pluggy, conecta o conector **MeuPluggy** à aplicação pessoal.
3. Guarda os identificadores das conexões e consulta os dados pela API.

O limite é de conexões ativas, não de transações nem de pessoas que entram no dashboard pelo Google. Uma conexão pode disponibilizar diferentes contas e produtos; não devemos presumir uma equivalência universal entre conexão, banco e cartão.

A atualização original no Meu Pluggy ocorre a cada 24 horas; a conexão da aplicação acompanha essa atualização e não pode forçá-la manualmente. A autorização da aplicação tem prazo próprio de um ano e precisa ser renovada, separado dos consentimentos bancários. [Guia de uso pessoal](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use), [regras de atualização](https://docs.pluggy.ai/en/docs/connections/item).

## Bancos já mencionados: C6, XP e Mercado Pago

Os três aparecem na cobertura de Open Finance da Pluggy com cartões e transações: **C6 Bank**, **XP Banking** e **Mercado Pago**. A tabela agrega contextos PF/PJ; a própria documentação pede validar os produtos no conector específico. Isso ainda não comprova que todos os dados dos cartões pessoais desejados chegarão pelo Meu Pluggy. [Cobertura oficial](https://docs.pluggy.ai/en/docs/open-finance/institutions-coverage).

Pontos a conferir com dados reais:

- Compras recentes podem chegar em atualizações diárias, sem disponibilidade imediata.
- Faturas abertas podem não ser retornadas até fechamento ou vencimento, conforme o banco.
- A XP pode retornar o valor total de uma compra parcelada em um registro sem vínculo de fatura. Esse registro não pode ser somado novamente às parcelas.

Fonte: [limitações documentadas para cartões e faturas](https://docs.pluggy.ai/en/docs/open-finance/considerations-faq).

## Trabalho necessário no aplicativo

Proposta técnica a detalhar após a escolha do caminho:

- Criar um serviço no servidor para consultar o fornecedor. As credenciais principais e a chave de API ficam no servidor, conforme a [documentação de autenticação](https://docs.pluggy.ai/en/reference/authentication).
- Verificar a sessão Google no servidor e vincular cada conexão ao usuário correto. O login atual não estabelece sozinho a propriedade das conexões bancárias.
- Identificar cada lançamento pela origem e pelos IDs externos. Hoje o modelo de despesas não tem campos próprios para essa identificação.
- Criar revisão de importação antes de alterar os gastos do usuário.
- Conciliar compras com parcelas e recorrências já cadastradas; tratar estornos e mudanças de lançamentos pendentes.
- Separar compra no cartão de pagamento de fatura para evitar contar a mesma despesa duas vezes.
- Mostrar última sincronização, falhas e necessidade de renovar autorização.

No piloto, o objetivo seria leitura de compras e faturas. Importar movimentações não exige que o produto ofereça pagamentos.

## Próximos passos sugeridos

1. Validar o fluxo do produto em sandbox, sem depender do prazo de teste em produção.
2. Se quisermos testar os próprios dados sem assinatura, manter esse experimento estritamente pessoal e separado da oferta pública.
3. Para a integração pública, comparar proposta comercial, cobertura PF dos três bancos, custo por volume e condições de cancelamento. Não presumir que o plano gratuito permite esse cenário.
4. Com o importador preparado, testar compras, parcelas, estornos e faturas em produção durante o período acordado.
5. Só ampliar o acesso depois de validar isolamento entre usuários e ausência de duplicidades em sincronizações repetidas.

Ainda em aberto: caminho pessoal ou comercial para a primeira entrega, banco inicial, cobertura efetiva de faturas, orçamento mensal e fornecedor. Nenhum deles foi escolhido por esta pesquisa.
