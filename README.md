# 📊 Dashboard de Planejamento & Controle Financeiro Pessoal

Um painel completo, interativo e extremamente polido para controle financeiro pessoal. Projetado com foco em usabilidade de alto nível, este dashboard permite planejar metas de economia, acompanhar receitas/gastos e monitorar despesas reais versus o planejado em tempo real. Ele implementa uma lógica financeira inteligente que preserva os objetivos de poupança programada mesmo com variações de receita.

---

## 🎨 Visual Preview & Design Philosophy
* **Interface Tech-Dark**: Paleta de cores escura e sofisticada, usando fundos profundos em tons de cinza carvão (`#141414`/`#161616`) e detalhes de alto contraste.
* **Tipografia Consistente**: Uso combinado de fontes versáteis para legibilidade e fontes mono-espaçadas nas áreas de dados financeiros estruturados.
* **Componentes Responsivos**: Alinhamento geométrico perfeito projetado para desktops de alta resolução, mantendo adaptabilidade total para dispositivos móveis com áreas de toque otimizadas.
* **Efeitos e Micro-interações**: Hover integrado, feedbacks visuais precisos e animações suaves de entrada em tabs e modais interativos.

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
* **Visualização Alternativa**: Alterna instantaneamente entre o formato de gráfico ou barras de progresso lineares de alta qualidade, que indicam de forma visual se o orçamento estipulado para cada categoria específica foi ultrapassado.

### 4. 📈 Gráficos de Evolução e Históricos
* **Evolução Temporal Acumulada**: Um gráfico de área detalhado construído com **Recharts** que exibe o histórico de gastos acumulados, com altura e área ajustadas e visualização limpa nas janelas de tempos.
* **Histórico de Entrada x Saída**: Gráficos de barra que traçam a comparação geral mês a mês para análises de tendências financeiras a longo prazo.

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
