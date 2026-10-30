# 📊 Dashboard de Planejamento & Controle Financeiro Pessoal

Um painel completo, interativo e extremamente polido para controle financeiro pessoal. Projetado com foco em usabilidade de alto nível, este dashboard permite planejar metas de economia, acompanhar receitas/gastos e monitorar despesas reais versus o planejado em tempo real. Ele implementa uma lógica financeira inteligente que preserva os objetivos de poupança programada mesmo com variações de receita.

---

## 🎨 Interface Sereno

* **Três visões**: **Visão geral** reúne resumo mensal, planejamento, gastos e limites, distribuição por categoria e histórico do ano. **Lançamentos do mês** mantém busca, filtros, pagamento individual e quitação de faturas por cartão e competência. **Visão do ano** permite escolher o ano e abrir os lançamentos de um mês pela tabela.
* **Aparência**: em **Configurações → Aparência**, escolha Claro, Escuro ou Automático. O tema escuro usa azul mineral (`#0d141c`/`#151e29`). A escolha só é persistida quando as preferências opcionais forem autorizadas.
* **Tipografia local**: Manrope é servida pelo próprio aplicativo em `public/fonts/`, com licença SIL OFL incluída. Não há requisição ao Google Fonts na navegação.
* **Cadastro em formulário**: os botões **Adicionar entrada** e **Adicionar despesa** abrem os formulários completos em uma janela, incluindo recorrência, parcelamento e cartões. Os filtros dos lançamentos são preservados ao alternar as visões.
* **Cores dos gráficos**: categorias usam cores vivas e estáveis nos dois temas. Passar o mouse ou tocar na legenda da pizza mostra categoria, valor e percentual, sem desbotar as demais fatias.

---

## 🚀 Funcionalidades Principais

### 1. 📂 Gerenciamento Geral de Lançamentos (Despesas e Receitas)
* **Saídas (Gastos)**: Permite cadastrar despesas especificando descrição, categoria (Alimentação, Transporte, Lazer, etc.), valor, data e método de pagamento.
* **Entradas (Rendimentos)**: Permite o registro detalhado de múltiplas fontes de entradas financeiras reais no mês.
* **Parcelamento Automático**: Ao lançar despesas parceladas, o sistema propaga automaticamente as parcelas subsequentes pelos meses seguintes.
* **Aviso de Exclusão Inteligente**: Ao tentar excluir uma despesa associada a um parcelamento, um modal de aviso dinâmico alerta sobre a remoção automática e permanente de todas as parcelas associadas àquela compra.

### 2. 🧠 Lógica de Orçamento Inteligente (A Regra da Poupança Ideal)
* **Cálculo Base de Teto**: O teto máximo de gastos do mês é deduzido a partir da Projeção de Salário Ideal subtraindo-se o percentual pretendido para poupança programada (Ex: meta de guardar 50% do salário).
* **Compensação por Receita Excedente**: Caso o usuário receba entradas adicionais acima do planejado no mês, o excedente financeiro é dinamicamente somado ao teto de gastos permitido. Isso garante que a **meta absoluta de guardar o valor programado original** seja mantida com segurança matemática, reduzindo ou evitando o alerta de estouro de orçamento.
* **KPI Cards Interativos**:
  * **Saldo Geral**: O balanço real do mês (Receitas Totais - Gastos Reais).
  * **Entradas vs. Planejado**: Visão de progresso comparando recebimentos reais ao esperado.
  * **Controle de Teto**: Exibe se há margem restante ou se o orçamento estourou de forma automatizada e adaptável ao saldo flexível.

### 3. 🍩 Gráfico de pizza interativo e Orçamento por Categorias
* **Donut interativo de Alta Resolução**: Exibe a distribuição exata dos gastos em gráficos pizza/donut aumentados e otimizados, exibindo detalhes visuais e proporções percentuais ao passar o cursor sobre as fatias.
* **Legendas Legíveis**: Legendas com fonte ampliada e legível, facilitando a identificação imediata das maiores categorias de consumo.
* **Visualização alternativa**: alterna entre pizza e lista de valores e percentuais. O gráfico **Gastos e limites** compara o gasto e o limite planejado com barras horizontais, incluindo categorias personalizadas sem limite cadastrado.

### 4. 📈 Gráficos de Evolução e Históricos
* **Histórico de gastos no ano**: mostra o total lançado em cada um dos 12 meses do ano selecionado, incluindo meses sem despesas. O valor aparece diretamente junto ao ponto, ao passar o mouse, tocar ou usar as setas do teclado. O gráfico mantém 190 px de altura e não soma anos diferentes.
* **Histórico de Entrada x Saída**: Gráficos de barra que traçam a comparação geral mês a mês para análises de tendências financeiras a longo prazo.

---

## 🔐 Armazenamento local e conta Google

* **Modo local**: os dados financeiros ficam neste navegador e podem ser usados sem uma conta Google.
* **Modo nuvem**: ao entrar com Google, o aplicativo carrega os dados associados à conta. Um perfil novo começa com as configurações padrão, sem importar os dados do navegador automaticamente.
* **Transferência manual**: para copiar os dados locais para a conta conectada, abra **Configurações → Dados e backups → Enviar dados do navegador**. Confirme a conta de destino antes do envio. Dados existentes na nuvem podem ser substituídos; a cópia local é mantida.
* **Ao sair da conta**: o aplicativo volta ao modo local e carrega os dados deste navegador.

### Topo compacto e preferências

O topo reúne a navegação mensal, o botão de ocultar valores, as configurações e o perfil. O perfil abre um cartão compacto para conectar ou sair da conta, com atalhos para os dados, backups e privacidade. O painel de configurações organiza orçamento e cartões, dados e backups, privacidade, aparência e ajuda, sem repetir as ações de login. A opção **Apagar cópia local** exige confirmação e limpa somente os dados financeiros deste navegador, preservando a sessão, as preferências e os dados da nuvem.

Ao ocultar valores, os gráficos continuam nítidos e interativos, com categorias, meses e percentuais visíveis. Os valores monetários, inclusive os detalhes ao passar o mouse, ficam desfocados; a escala numérica dos gráficos fica oculta. Campos de valor são revelados durante a edição. Essa opção altera somente a apresentação na tela.

Os dados de atendimento são configurados em `src/config/appContact.ts`; o canal de email só aparece quando um contato for definido. A exclusão da conta e dos dados da nuvem ainda não está implementada.

### Lançamentos mensais recorrentes

No cadastro de despesas, escolha **Único**, **Parcelado** ou **Recorrente mensal**. Nos rendimentos, escolha **Único** ou **Recorrente mensal**. A recorrência repete o valor inteiro a cada mês, sem dividi-lo em parcelas.

Informe a duração de 1 a 120 meses, incluindo o primeiro lançamento, ou use os atalhos de 3, 6, 12 meses e **Até dezembro**. O formulário mostra a quantidade, o valor mensal e o período antes de salvar. Despesas recorrentes começam como não pagas; em meses sem o dia escolhido, o lançamento usa o último dia do mês.

Ao editar ou excluir um lançamento mensal, escolha **Somente este mês** ou **Este mês e os próximos**. A identificação da série preserva os registros anteriores, o status de pagamento de cada mês e a separação entre séries com nomes iguais. Os dados da série também são mantidos ao exportar/importar backups e no envio manual para a nuvem.

Para verificar: `npm test`, `npm run lint` e `npm run build`. As regras em `firestore.rules` incluem a validação dos campos de recorrência e devem acompanhar a implantação das regras do projeto Firebase.

---

## 🛠️ Tecnologias Utilizadas

* **React 18+ & Vite** — Ferramental moderno e compilação rápida para desenvolvimento web.
* **TypeScript** — Tipagem estática rígida garantindo consistência e segurança contra bugs comuns.
* **Tailwind CSS** — Estilização robusta focada em classes utilitárias e design responsivo nativo.
* **Recharts & D3** — Biblioteca modular instalada para plotagem de gráficos de área, barras e donuts interativos.
* **Lucide React** — Conjunto elegante de ícones para interfaces profissionais.
* **Motion (Framer Motion)** — Micro-animações e transições no DOM.

---

## 📥 Instalação e Execução Local

```bash
# 1. Clone o repositório para o seu ambiente local
git clone https://github.com/seu-usuario/seu-repositorio.git

# 2. Navegue até a pasta do projeto
cd seu-repositorio

# 3. Instale as dependências externas do arquivo package.json
npm install

# 4. Inicie o servidor de desenvolvimento local
npm run dev

# 5. Para compilar a aplicação para produção
npm run build
```

---

## 📝 Resumo dos Ajustes Visuais Recentes
1. **Otimização do Gráfico Pizza**: O diâmetro do donut e da fiação do gráfico pizza foi aumentado, enquanto o label descritivo central foi reposicionado para maior harmonia espacial.
2. **Qualidade Textual**: Aumentado o tamanho da fonte da legenda de proporções em aproximadamente 50%, proporcionando excelente leitura mesmo à distância.
3. **Casamento de Layout e Bento-Grid**: A altura dos cards foi calibrada em conjunto (`h-[569px]` e `h-[235px]`) para que o gráfico pizza de categorias e os gráficos temporais se alinhem perfeitamente na grade horizontal, evitando estouros indesejados e mantendo o contorno retangular limpo.
4. **Precisão Algorítmica**: Ajustada e integrada a regra que acrescenta os ganhos adicionais do mês ao teto de gastos permitido, permitindo de forma fluida manter intactas as metas originais de poupança em todos os meses.

### Demonstração local com dados fictícios

Com o servidor de desenvolvimento aberto, acesse `http://127.0.0.1:3000/?demo=2026` para visualizar despesas, receitas, cartões e orçamentos de janeiro a dezembro. Essa demonstração só funciona em desenvolvimento: não inicializa o Firebase e mantém as alterações apenas na memória, sem substituir os dados salvos no navegador. Atualizar a página restaura os exemplos; o link **Voltar aos meus dados** abre o uso normal.

### Cookies e armazenamento

O aviso inicial oferece rejeição dos opcionais, aceite e personalização, sem bloquear o planejamento nem considerar a navegação como consentimento. Os opcionais começam desativados. A área **Privacidade → Gerenciar escolhas** e o link **Cookies e preferências** no rodapé permitem rever ou revogar a decisão.

A categoria opcional controla somente `app-theme` e `hide-mobile-budgets`. Sem autorização válida, essas preferências funcionam durante a visita, sem leitura ou gravação persistente. A revogação remove apenas essas chaves e é respeitada pelas demais abas. O planejamento financeiro, a sessão, o modo local/nuvem e a escolha de ocultar valores não são apagados.

A decisão é registrada localmente em `financas10-cookie-choice`, com finalidade, origem da escolha, versão do aviso, data e validade de 180 dias (prazo adotado pelo aplicativo, não prazo legal obrigatório). Mudanças de finalidades devem atualizar `COOKIE_POLICY_VERSION` e exigir nova escolha. A demonstração mantém as decisões apenas em memória. O aplicativo não inclui ferramentas de publicidade ou análise de audiência; novas integrações precisam de avaliação e bloqueio efetivo antes de qualquer consentimento aplicável.

A implementação usa como referência o [Guia de Cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais). O aviso não substitui a definição das bases legais do tratamento, a identificação do responsável, o atendimento aos titulares ou as demais medidas de adequação à LGPD.
