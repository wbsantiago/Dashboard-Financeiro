/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';
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
  totalCategoryLimits?: number;
  onEditBudget: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalSpent,
  salary,
  targetSavingsPercentage,
  extraIncome,
  selectedMonth,
  futureInstallmentsDebt = 0,
  expenses = [],
  totalCategoryLimits,
  onEditBudget,
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
    <div className="sereno-kpis" id="kpi-cards-grid">
      <section className="sereno-totals" aria-label="Resumo do mês">
        <div><p>Entradas do mês</p><strong className="privacy-blur">{formatCurrency(totalRevenue)}</strong></div>
        <div><p>Despesas lançadas</p><strong className="privacy-blur">{formatCurrency(totalSpent)}</strong></div>
        <div><p>Saldo do mês</p><strong className={'privacy-blur ' + (balance < 0 ? 'sereno-danger-text' : 'sereno-good-text')}>{formatCurrency(balance)}</strong><small>Entradas menos despesas lançadas</small></div>
      </section>
      <section className="sereno-panel sereno-planning" aria-labelledby="planning-title">
        <div className="sereno-section-heading"><h2 id="planning-title">Seu planejamento</h2><button type="button" className="sereno-link" onClick={onEditBudget}>Ajustar</button></div>
        <div className="sereno-plan-grid">
          <div><p>Renda planejada</p><strong className="privacy-blur">{formatCurrency(salary)}</strong></div>
          <div><p>Meta para guardar ({targetSavingsPercentage}%)</p><strong className="privacy-blur">{formatCurrency(plannedSavings)}</strong></div>
          <div><p>Limite de gastos do mês</p><strong className="privacy-blur">{formatCurrency(adjustedMaxSpentAllowed)}</strong></div>
          <div><p>Parcelas dos próximos meses</p><button type="button" className="sereno-debt-link" onClick={() => setShowDebtDetails(true)}><span className="privacy-blur">{formatCurrency(futureInstallmentsDebt)}</span><span aria-hidden="true">›</span></button></div>
        </div>
        <p className={isOverBudget ? 'sereno-danger-text sereno-margin' : 'sereno-good-text sereno-margin'}>{isOverBudget ? 'Acima do limite do mês: ' : 'Margem no limite do mês: '}<span className="privacy-blur">{formatCurrency(Math.abs(budgetDiff))}</span></p>
        <details className="sereno-plan-details"><summary>Como esse planejamento é calculado</summary><div>
          <p>A renda planejada menos a meta para guardar define o limite base de gastos. Entradas acima da renda planejada ampliam esse limite, mantendo a meta em reais.</p>
          <p>Entradas em relação ao planejado: <span className="privacy-blur">{formatCurrency(revenueVsIdealDiff)}</span>. Limites por categoria somados: <span className="privacy-blur">{formatCurrency(totalCategoryLimits || 0)}</span>.</p>
          <p>O saldo considera todas as despesas lançadas no mês, inclusive as ainda não pagas. Ele não representa o saldo da sua conta bancária.</p>
        </div></details>
      </section>
      {/* MODAL DE DETALHAMENTO DA DÍVIDA FUTURA */}
      {showDebtDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="Detalhamento da dívida futura" className="bg-[#141414] border border-white/5 max-w-2xl w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
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
                        <td className="py-2 px-3 text-right text-slate-300 font-mono"><span className="privacy-blur">{formatCurrency(item.value)}</span></td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-500 font-mono">
                          {item.current}/{item.total}
                        </td>
                        <td className="py-2 px-3 text-center text-indigo-300 font-semibold font-mono">
                          {item.remaining}
                        </td>
                        <td className="py-2 px-3 text-right text-indigo-400 font-bold font-mono">
                          <span className="privacy-blur">{formatCurrency(item.totalRemainingDebt)}</span>
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
                <span className="privacy-blur">{formatCurrency(futureInstallmentsDebt)}</span>
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
