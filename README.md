# 📊 Dashboard de Finanças Pessoais

Um painel financeiro interativo, moderno e de altíssimo nível visual projetado com **React, TypeScript e Tailwind CSS**. Este sistema adota uma filosofia de design sólida, aplicando uma interface escura sofisticada (estilo *Fintech Dark Mode*), micro-interações elegantes e um alinhamento perfeitamente retangular entre todos os seus blocos de informação na grade central (*Bento Grid Alignment*).

---

## 🚀 Como Funciona o Dashboard?

O dashboard foi projetado para operar de forma transparente, permitindo que você controle fluxos monetários sem esforço. Ele baseia-se em quatro pilares para o registro e mitigação de desvios financeiros.

### 📌 1. Como são feitas as Entradas e Saídas?

* **Entradas (Receitas)**: São registradas de forma discriminada no painel de lançamentos. Você pode especificar o valor, a data da entrada e uma descrição clara (ex: "Salário CLT", "Freelance Design"). O sistema calcula o somatório de todas as fontes em tempo real.
* **Saídas (Despesas/Gastos)**: Cada despesa é associada a uma categoria (Alimentação, Transporte, Lazer, etc.) e um método de pagamento (Dinheiro, PIX, Cartão de Crédito). 
* **Parcelamentos com Remoção Protegida**: Ao cadastrar uma compra parcelada, o sistema propaga automaticamente as parcelas nos meses subsequentes. Ao tentar excluir uma dessas parcelas, um modal de segurança alerta você sobre a exclusão em lote de toda a cadeia do parcelamento associado.

---

## 💳 Os 4 Indicadores do Cabeçalho Superior

No topo da página, quatro cartões estratégicos resumem a saúde do seu mês. Cada um possui um papel matemático exato no desenho das suas metas:

### 1. Salário Ideal (Projeção Base)
* **O que representa**: O salário inicial planejado ou esperado para o mês corrente, definido nas configurações de perfil.
* **Função**: É o ponto de referência estático para o planejamento. Com base nele, calcula-se o percentual de poupança pretendido (ex: guardar 30% do salário ideal) e define-se o teto de gastos base do mês.

### 2. Entradas do Mês (Receita Real)
* **O que representa**: O montante total de receitas reais que efetivamente entraram em sua conta ao longo do mês (Salário base + Rendas extras/Freelances).
* **Função**: Exibe em formato numérico e barra de progresso quão próximo você está de atingir ou superar a meta salarial ideal traçada para o período.

### 3. Gastos do Mês (Saídas Reais)
* **O que representa**: A soma consolidada de todas as despesas reais debitadas ou reservadas no mês de análise (incluindo parcelas vigentes de meses passados).
* **Função**: Serve como termômetro do volume de consumo acumulado até o presente dia.

### 4. Controle do Teto (Status Dynamic Budget)
* **O que representa**: A margem real restante antes do orçamento estourar, aplicando a **Regra da Poupança Ideal Absoluta**.
* **Como funciona (Lógica Inteligente)**: 
  $$\text{Teto Ajustado} = (\text{Salário Ideal} - \text{Poupança Programada}) + \text{Receitas Excedentes}$$
  Se o seu rendimento superar o salário ideal, o sistema somará essa receita excedente ao seu limite admissível de gastos. Isso impede que seu orçamento apresente sinais falsos de estouro apenas por ter consumido um dinheiro adicional que ultrapassou a projeção padrão, mantendo o valor poupado original intocado e blindado. Elencado em tonalidades inteligentes (Verde para **Margem Segura** e Vermelho para **Orçamento Estourado**).

---

## 📊 Análise dos Gráficos Interativos

O painel central organiza-se em três apresentações visuais de dados conectadas:
