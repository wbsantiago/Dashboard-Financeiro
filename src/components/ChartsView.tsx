/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { CategoryBudget, Expense } from '../types';
import { formatCurrency, formatShortMonthYear } from '../utils/format';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';

interface ChartsViewProps {
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
  selectedMonth: string;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  expenses,
  categoryBudgets,
  selectedMonth,
}) => {
  // Gasto real por categoria
  const expensesInMonth = expenses.filter(e => e.month === selectedMonth);
  const expensesByCategory = expensesInMonth.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {} as Record<string, number>);

  // Data for Category comparison Real x Ideal (Horizontal Bars / Vertical Categories)
  const barChartData = categoryBudgets.map(b => {
    const realSpend = expensesByCategory[b.category] || 0;
    return {
      category: b.category,
      "Gasto Real": parseFloat(realSpend.toFixed(2)),
      "Meta Ideal": parseFloat(b.idealLimit.toFixed(2)),
    };
  });

  // Data for Timeline history chart
  const allMonths: string[] = expenses.map(e => e.month).filter((val, index, self) => self.indexOf(val) === index).sort();
  
  if (!allMonths.includes(selectedMonth)) {
    allMonths.push(selectedMonth);
    allMonths.sort();
  }

  const areaChartData = allMonths.map(m => {
    const monthExpenses = expenses.filter(e => e.month === m);
    const totalSpentInM = monthExpenses.reduce((sum, item) => sum + item.value, 0);
    return {
      monthCode: m,
      monthName: formatShortMonthYear(m),
      "Gasto do Mês": parseFloat(totalSpentInM.toFixed(2)),
    };
  });

  // Custom tooltips
  const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] text-white rounded-xl p-3 shadow-lg border border-white/10 text-xs font-sans">
          <p className="font-bold mb-1.5 text-slate-200">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between gap-4 font-medium mb-0.5 last:mb-0">
              <span style={{ color: p.color || p.fill }}>{p.name}:</span>
              <span className="font-mono font-bold text-slate-100">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard-charts-grid">
      {/* GRÁFICO 1: COMPARATIVO GASTO REAL x TETO MÁXIMO (VERTICAL BAR CHART COUPLING / SPREADS ALL 12 COLS OF CHARTS PANEL) */}
      <div 
        className="lg:col-span-12 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col h-[310px]" 
        id="comparison-vertical-bar-chart-container"
      >
        <div className="flex items-center gap-2 mb-3.5 shrink-0">
          <div className="p-1 px-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Comparativo das Categorias (Real vs Ideal)</h3>
            <p className="text-[10px] text-slate-400 font-medium">Veja onde está ultrapassando o planejamento de cada setor</p>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222222" />
              <XAxis 
                dataKey="category" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 550 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomCurrencyTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Legend 
                verticalAlign="top" 
                height={35} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}
              />
              <Bar dataKey="Gasto Real" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Meta Ideal" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: EVOLUÇÃO TEMPORAL MENSAL (12 COLS - Bento Grid Accent) */}
      <div 
        className="lg:col-span-12 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col h-[235px]" 
        id="history-area-chart-container"
      >
        <div className="flex items-center gap-2 mb-3.5 shrink-0">
          <div className="p-1 px-1.5 rounded-lg bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/10">
            <LineIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Histórico de Gastos Acumulados</h3>
            <p className="text-[10px] text-slate-400 font-medium">Cronograma de evolução do total gasto ao longo do tempo</p>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={areaChartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorExps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.00}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222222" />
              <XAxis 
                dataKey="monthName" 
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 550 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomCurrencyTooltip />} />
              <Area 
                type="monotone" 
                dataKey="Gasto do Mês" 
                stroke="#22d3ee" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorExps)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
