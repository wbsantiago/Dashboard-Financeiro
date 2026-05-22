/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  Wallet, 
  Calculator, 
  Sparkles,
  Info,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface KpiCardsProps {
  totalSpent: number;
  salary: number; // O salário ideal definido pelo usuário
  targetSavingsPercentage: number;
  extraIncome: number; // Freelance / Outros adicionais
  selectedMonth: string;
  futureInstallmentsDebt?: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalSpent,
  salary,
  targetSavingsPercentage,
  extraIncome,
  selectedMonth,
  futureInstallmentsDebt = 0,
}) => {
  const totalRevenue = extraIncome; // O rendimento do mês é estritamente a somatória de todas as entradas reais cadastradas
  const balance = totalRevenue - totalSpent;

  // O Teto Base de Gastos é calculado estritamente a partir do salário ideal definido (rendimento fixo planejado)
  const maxSpentAllowed = salary * (1 - targetSavingsPercentage / 100);
  const plannedSavings = salary * (targetSavingsPercentage / 100);
  
  // Diferença do gasto com relação ao planejado
  const budgetDiff = maxSpentAllowed - totalSpent;
  const isOverBudget = totalSpent > maxSpentAllowed;

  // Diferença entre entradas reais e projeção de salário ideal
  const revenueVsIdealDiff = totalRevenue - salary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="kpi-cards-grid">
      {/* CARD 1: SALÁRIO IDEAL DEFINIDO (FIXO) */}
      <div 
        className="bg-[#161616] rounded-2xl p-5 border border-white/5 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-white/10"
        id="kpi-card-salary-ideal"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Salário Ideal (Fixo)</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-sans privacy-blur">
              {formatCurrency(salary)}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
            <Calculator className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Poupança Ideal: <strong className="text-indigo-400 font-mono font-bold">{targetSavingsPercentage}%</strong></span>
          <span className="text-slate-600">|</span>
          <span>Guardar: <strong className="text-white font-mono font-bold privacy-blur">{formatCurrency(plannedSavings)}</strong></span>
        </div>
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
      </div>

      {/* CARD 2: RECENT TOTAL REVENUES (SALÁRIO + PLUS EXTRA) */}
      <div 
        className="bg-[#161616] rounded-2xl p-5 border border-white/5 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-white/10"
        id="kpi-card-revenues-total"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Rendimento do Mês</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-sans privacy-blur">
              {formatCurrency(totalRevenue)}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3.5 flex flex-col gap-2">
          <div className="flex items-center text-[10px] text-slate-400 justify-between w-full">
            {totalRevenue === 0 ? (
              <span className="text-slate-500 font-medium font-sans">Sem entradas cadastradas neste mês</span>
            ) : revenueVsIdealDiff < 0 ? (
              <span className="text-slate-400 font-sans leading-tight">
                Faltam <strong className="text-amber-400 font-mono font-bold privacy-blur">{formatCurrency(Math.abs(revenueVsIdealDiff))}</strong> para atingir o salário ideal
              </span>
            ) : (
              <span className="text-slate-400 font-sans leading-tight">
                Receita real superou o ideal planejado em <strong className="text-emerald-400 font-mono font-bold privacy-blur">+{formatCurrency(revenueVsIdealDiff)}</strong>
              </span>
            )}
          </div>
          
          <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[11px] bg-white/2 rounded-lg p-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Sobra (Poupar):
            </span>
            <span className={`font-mono font-extrabold text-[13px] privacy-blur ${balance >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
      </div>

      {/* CARD 3: GASTOS TOTAIS MENSAL */}
      <div 
        className="bg-[#161616] rounded-2xl p-5 border border-white/5 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-white/10"
        id="kpi-card-expenses"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Gastos Mensais</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-sans privacy-blur">
              {formatCurrency(totalSpent)}
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/10">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Teto Recomendado:</span>
          <span className="font-semibold text-slate-300 font-mono privacy-blur">
            {formatCurrency(maxSpentAllowed)}
          </span>
        </div>
        {futureInstallmentsDebt > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dívida Futura (Cartão):</span>
            <span className="font-bold text-indigo-400 font-mono privacy-blur">
              {formatCurrency(futureInstallmentsDebt)}
            </span>
          </div>
        )}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
      </div>

      {/* CARD 4: DIAGNÓSTICO DO PLANEJAMENTO (DENTRO OU ACIMA DO PLANO) */}
      <div 
        className={`rounded-2xl p-5 border shadow-xs relative overflow-hidden transition-all duration-200 bg-[#161616] hover:shadow-lg group ${
          isOverBudget 
            ? 'border-rose-500/20' 
            : 'border-emerald-500/20'
        }`}
        id="kpi-card-status-plan"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Status do Teto</p>
            <h3 className={`text-xl font-extrabold mt-1.5 font-sans flex items-center gap-1.5 ${
              isOverBudget ? 'text-rose-400 animate-pulse' : 'text-emerald-450'
            }`}>
              {isOverBudget ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  Acima do Plano
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  Dentro do Plano
                </>
              )}
            </h3>
          </div>
          <div className={`p-2.5 rounded-xl ${
            isOverBudget 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
          }`}>
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3.5 flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[10px]">
              {isOverBudget ? 'Orçamento estourado em:' : 'Margem de segurança:'}
            </span>
            <span className={`font-mono font-bold text-xs privacy-blur ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isOverBudget ? '' : '+'}{formatCurrency(budgetDiff)}
            </span>
          </div>

          <div className="border-t border-white/5 pt-2 flex justify-between items-center bg-white/2 rounded-lg p-1.5 mt-0.5">
            <span className="text-slate-300 text-[11px] flex items-center gap-1 font-semibold">
              <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Sobra Real:
            </span>
            <span className={`font-mono font-extrabold text-[13px] privacy-blur ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
        <div className={`absolute top-0 left-0 w-1.5 h-full ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-400'}`}></div>
      </div>
    </div>
  );
};
