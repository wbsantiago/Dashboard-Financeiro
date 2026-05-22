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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { CategoryBudget, Expense } from '../types';
import { formatCurrency, formatMonthName, getJustMonthName } from '../utils/format';
import { CATEGORY_COLORS } from '../utils/storage';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';

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
  // 1. BAR CHART: Comparativo Gasto Real x Gasto Ideal
  const expensesInMonth = expenses.filter(e => e.month === selectedMonth);

  // Gasto real por categoria
  const expensesByCategory = expensesInMonth.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {} as Record<string, number>);

  const barChartData = categoryBudgets.map(b => {
    const realSpend = expensesByCategory[b.category] || 0;
    return {
      category: b.category,
      "Gasto Real": parseFloat(realSpend.toFixed(2)),
      "Meta Ideal": parseFloat(b.idealLimit.toFixed(2)),
    };
  });

  // 2. PIE CHART: Distribuição Percentual de Gastos
  const pieChartData = Object.keys(expensesByCategory)
    .map(cat => {
      const val = expensesByCategory[cat];
      return {
        name: cat,
        value: parseFloat(val.toFixed(2)),
        color: CATEGORY_COLORS[cat] || '#6b7280',
      };
    })
    .filter(item => item.value > 0);

  const totalExpenseInMonth = pieChartData.reduce((sum, item) => sum + item.value, 0);

  // 3. AREA CHART: Histórico de Gastos por Mês (Linha de ritmo)
  // Obter todos os meses com lançamentos
  const allMonths: string[] = expenses.map(e => e.month).filter((val, index, self) => self.indexOf(val) === index).sort();
  
  // Se houver poucos meses, garanta que mostre o mês selecionado
  if (!allMonths.includes(selectedMonth)) {
    allMonths.push(selectedMonth);
    allMonths.sort();
  }

  const areaChartData = allMonths.map(m => {
    const monthExpenses = expenses.filter(e => e.month === m);
    const totalSpentInM = monthExpenses.reduce((sum, item) => sum + item.value, 0);
    return {
      monthCode: m,
      monthName: getJustMonthName(m),
      "Gasto do Mês": parseFloat(totalSpentInM.toFixed(2)),
    };
  });

  // Custom tooltips for Recharts
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

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalExpenseInMonth > 0 ? ((data.value / totalExpenseInMonth) * 100).toFixed(1) : 0;
      return (
        <div className="bg-[#1a1a1a] text-white rounded-xl p-3 shadow-lg border border-white/10 text-xs font-sans">
          <p className="font-bold flex items-center gap-1.5" style={{ color: data.color }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.color }} />
            {data.name}
          </p>
          <div className="mt-1.5 space-y-0.5">
            <p className="font-semibold text-slate-400">
              Valor: <span className="font-mono text-white font-bold">{formatCurrency(data.value)}</span>
            </p>
            <p className="font-semibold text-slate-400">
              Proporção: <span className="font-mono text-white font-bold">{pct}% do total</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard-charts-grid">
      {/* GRÁFICO 1: COMPARATIVO GASTO REAL x TETO MÁXIMO (8 COLS) */}
      <div className="lg:col-span-8 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col h-[320px]" id="comparison-bar-chart-container">
        <div className="flex items-center gap-2 mb-3.5 shrink-0">
          <div className="p-1 px-1.5 rounded-lg bg-indigo-505/10 text-indigo-400 border border-indigo-500/10">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Comparativo das Categorias (Real vs Ideal)</h3>
            <p className="text-[10px] text-slate-400 font-medium">Veja onde está ultrapassando o planejamento sugerido</p>
          </div>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
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
                height={30} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}
              />
              <Bar dataKey="Gasto Real" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="Meta Ideal" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: FATIA DE GASTOS (4 COLS) */}
      <div className="lg:col-span-4 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col h-[320px]" id="distribution-pie-chart-container">
        <div className="flex items-center gap-2 mb-3.5 shrink-0">
          <div className="p-1 px-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/10">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Distribuição por Categoria</h3>
            <p className="text-[10px] text-slate-400 font-medium">Proporção total de saídas no mês corrente</p>
          </div>
        </div>

        {pieChartData.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-550 text-xs">
            <p className="font-semibold">Nenhum dado financeiro</p>
            <p className="text-[10px] mt-0.5">Registre despesas para ver a pizza.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centro da Rosquinha */}
              <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Total Pago</p>
                <p className="text-xs font-extrabold text-white font-sans mt-0.5">
                  {formatCurrency(totalExpenseInMonth)}
                </p>
              </div>
            </div>

            {/* Legendas de Cores Compactas */}
            <div className="grid grid-cols-2 gap-2 mt-1.5 max-h-[90px] overflow-y-auto shrink-0 pr-1 text-[10px] scrollbar-thin">
              {pieChartData.map((item, idx) => {
                const pct = ((item.value / totalExpenseInMonth) * 100).toFixed(0);
                return (
                  <div key={idx} className="flex items-center gap-1.5 font-medium text-slate-400 hover:text-white transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate flex-1 text-[9px]" title={item.name}>{item.name}</span>
                    <span className="font-mono font-bold text-slate-300 bg-zinc-900 px-1 py-0.5 rounded text-[8px] shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* GRÁFICO 3: EVOLUÇÃO TEMPORAL MENSAL (12 COLS - Bento Grid Accent) */}
      <div className="lg:col-span-12 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col h-[210px]" id="history-area-chart-container">
        <div className="flex items-center gap-2 mb-3.5 shrink-0">
          <div className="p-1 px-1.5 rounded-lg bg-cyan-550/10 text-cyan-400 border border-cyan-500/10">
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
