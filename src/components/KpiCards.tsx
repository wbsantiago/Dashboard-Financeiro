/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  PiggyBank, 
  Wallet, 
  Calculator, 
  Sparkles,
  Info,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { formatCurrency, getInstallmentInfo, formatMonthName } from '../utils/format';
import { Expense } from '../types';

interface KpiCardsProps {
  totalSpent: number;
  salary: number; // O salário ideal definido pelo usuário
  targetSavingsPercentage: number;
  extraIncome: number; // Freelance / Outros adicionais
  selectedMonth: string;
  futureInstallmentsDebt?: number;
  expenses?: Expense[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalSpent,
  salary,
  targetSavingsPercentage,
  extraIncome,
  selectedMonth,
  futureInstallmentsDebt = 0,
  expenses = [],
}) => {
  const [showDebtDetails, setShowDebtDetails] = useState(false);
  const totalRevenue = extraIncome; // O rendimento do mês é estritamente a somatória de todas as entradas reais cadastradas
  const balance = totalRevenue - totalSpent;

  // O que está previsto no mês (rendimento fixo planejado)
  const previstoNoMes = salary;

  // O quanto será guardado (poupança programada em valor real)
  const planejadoGuardar = previstoNoMes * (targetSavingsPercentage / 100);

  // Receita que superou o salário ideal no mês (se houver)
  const receitaExcedente = Math.max(0, totalRevenue - salary);

  // O Teto Base de Gastos é calculado a partir do que está previsto menos o quanto será guardado
  const maxSpentAllowed = previstoNoMes - planejadoGuardar;
  const plannedSavings = planejadoGuardar;
  
  // O teto é acrescido do excedente de receita, mantendo a poupança ideal absoluta pretendida
  const adjustedMaxSpentAllowed = maxSpentAllowed + receitaExcedente;

  // Diferença do gasto com relação ao planejado ajustado (estouro ou margem)
  const budgetDiff = adjustedMaxSpentAllowed - totalSpent;
  const isOverBudget = totalSpent > adjustedMaxSpentAllowed;

  // Diferença entre entradas reais e projeção de salário ideal
  const revenueVsIdealDiff = totalRevenue - salary;

  // Filtra as despesas do mês selecionado que contribuem para a dívida futura
  const expensesInMonth = expenses.filter(e => e.month === selectedMonth);

  const debtBreakdown = expensesInMonth.map(exp => {
    const info = getInstallmentInfo(exp);
    const isInst = info.hasInfo || exp.isInstallment;
    if (isInst && info.remaining > 0) {
      return {
        id: exp.id,
        title: exp.title,
        value: exp.value,
        remaining: info.remaining,
        total: info.total,
        current: info.current,
        totalRemainingDebt: exp.value * info.remaining,
        date: exp.date,
        category: exp.category
      };
    }
    return null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);

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
            <div className="flex items-center gap-1">
              <span>Dívida Futura (Cartão):</span>
              <button
                type="button"
                onClick={() => setShowDebtDetails(true)}
                className="text-slate-500 hover:text-indigo-400 transition-colors p-0.5 rounded cursor-pointer"
                title="Clique para ver detalhamento das parcelas"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span 
              onClick={() => setShowDebtDetails(true)}
              className="font-bold text-indigo-400 font-mono privacy-blur hover:underline cursor-pointer"
              title="Clique para ver detalhamento das parcelas"
            >
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

      {/* MODAL DE DETALHAMENTO DA DÍVIDA FUTURA */}
      {showDebtDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/5 max-w-2xl w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Detalhamento da Dívida Futura (Cartão)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDebtDetails(false)}
                className="p-1 hover:bg-white/5 text-slate-450 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed bg-[#1c1c1c] p-3 rounded-xl border border-white/5">
              <p>
                <strong>Como funciona o cálculo?</strong> Para cada despesa parcelada ativa observada neste mês de <strong>{formatMonthName(selectedMonth)}</strong>, calculamos o valor restante somando as prestações dos meses subsequentes.
              </p>
              <p className="mt-1">
                Fórmula: <code className="bg-[#0a0a0a] px-1.5 py-0.5 rounded font-mono text-indigo-400">Valor da Parcela × Parcelas Restantes</code>. 
                Isso representa o montante total de dívida que já foi assumido no cartão para os próximos meses mas ainda não foi pago.
              </p>
            </div>

            <div className="overflow-y-auto flex-1 min-h-[150px] max-h-[300px] border border-white/5 rounded-xl bg-zinc-950">
              {debtBreakdown.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-550">
                  Nenhuma despesa parcelada ativa com parcelas restantes identificada neste mês.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#121212] text-slate-300 font-bold">
                      <th className="py-2.5 px-3">Lançamento</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Prestação</th>
                      <th className="py-2.5 px-3 text-center">Progresso</th>
                      <th className="py-2.5 px-3 text-center">Restam</th>
                      <th className="py-2.5 px-3 text-right">Dívida Futura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtBreakdown.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="py-2 px-3 font-semibold text-white">{item.title}</td>
                        <td className="py-2 px-3 text-slate-400">{item.category}</td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">{formatCurrency(item.value)}</td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-500 font-mono">
                          {item.current}/{item.total}
                        </td>
                        <td className="py-2 px-3 text-center text-indigo-300 font-semibold font-mono">
                          {item.remaining}
                        </td>
                        <td className="py-2 px-3 text-right text-indigo-400 font-bold font-mono">
                          {formatCurrency(item.totalRemainingDebt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/5 text-xs">
              <span className="text-slate-400">Total acumulado de parcelas subsequentes:</span>
              <span className="text-base font-extrabold text-indigo-400 font-mono">
                {formatCurrency(futureInstallmentsDebt)}
              </span>
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowDebtDetails(false)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
