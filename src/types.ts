/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Expense {
  id: string;
  title: string;
  value: number;
  category: string;
  month: string; // "YYYY-MM"
  isInstallment: boolean;
  totalInstallments?: number;
  currentInstallment?: number;
  firstInstallmentInNextMonth?: boolean;
  date: string; // "YYYY-MM-DD"
  createdAt: number;
  paid?: boolean;
}

export interface Revenue {
  id: string;
  title: string;
  value: number;
  category: string; // ex: "CLT", "Freelance", "Dívida", "Investimento", "Outros"
  month: string; // "YYYY-MM"
  date: string; // "YYYY-MM-DD"
  createdAt: number;
}

export interface CategoryBudget {
  category: string;
  idealLimit: number; // Teto de gastos ideal para esta categoria
}

export interface MonthlyBudget {
  month: string; // "YYYY-MM"
  salary: number; // Salário padrão do mês (servirá como base se não houver rendimentos lançados)
  targetSavingsPercentage: number; // Porcentagem que gostaria de poupar (ex: 30%)
  cardClosingDay?: number; // Dia de fechamento/virada do cartão (ex: 5, use 0 para não aplicar)
}

export interface AppData {
  expenses: Expense[];
  revenues?: Revenue[];
  categoryBudgets: CategoryBudget[];
  monthlyBudgets: MonthlyBudget[];
  defaultMonthlySalary: number;
  defaultTargetSavingsPercentage: number;
  defaultCardClosingDay?: number; // Dia de fechamento padrão do cartão (ex: 5)
}
