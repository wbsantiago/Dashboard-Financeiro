/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { formatCurrency, formatMonthName, getJustMonthName, formatShortMonthYear } from '../utils/format';
import { CATEGORY_COLORS } from '../utils/storage';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, List } from 'lucide-react';

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
  const [distView, setDistView] = useState<'donut' | 'bars'>('donut');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
      monthName: formatShortMonthYear(m),
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
          <div className="p-1 px-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
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
        <div className="flex items-center justify-between mb-3.5 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 px-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/10 shrink-0">
              <PieIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate">Distribuição por Categoria</h3>
              <p className="text-[10px] text-slate-400 font-medium truncate">Mês corrente</p>
            </div>
          </div>

          {/* BOTÕES DE SELEÇÃO DE VISÃO (Donut vs Progresso) */}
          {pieChartData.length > 0 && (
            <div className="flex bg-[#111111] border border-white/5 p-0.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setDistView('donut')}
                className={`p-1 px-2 rounded-lg text-[9px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  distView === 'donut'
                    ? 'bg-zinc-800 text-pink-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em Gráfico de Pizza"
              >
                <PieIcon className="w-3 h-3" />
                <span className="hidden xs:inline">Gráfico</span>
              </button>
              <button
                type="button"
                onClick={() => setDistView('bars')}
                className={`p-1 px-2 rounded-lg text-[9px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  distView === 'bars'
                    ? 'bg-zinc-800 text-pink-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em Lista de Progresso"
              >
                <List className="w-3 h-3" />
                <span className="hidden xs:inline">Lista</span>
              </button>
            </div>
          )}
        </div>

        {pieChartData.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-550 text-xs">
            <p className="font-semibold text-slate-400">Nenhum dado financeiro</p>
            <p className="text-[10px] mt-0.5 text-slate-500">Registre despesas para ver a distribuição.</p>
          </div>
        ) : distView === 'donut' ? (
          <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
            {/* Gráfico ampliado e reposicionado */}
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={98}
                    paddingAngle={2.5}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {pieChartData.map((entry, index) => {
                      const isHovered = activeIndex === index;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          opacity={activeIndex === null || isHovered ? 1 : 0.35}
                          style={{
                            transition: 'all 200s ease-out',
                            cursor: 'pointer',
                          }}
                          stroke={isHovered ? '#ffffff' : 'none'}
                          strokeWidth={isHovered ? 2 : 0}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centro da Rosquinha (Perfeitamente Centralizado e Dinâmico) */}
              <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center select-none w-full max-w-[130px]" id="donut-center-interactive-label">
                {activeIndex !== null && pieChartData[activeIndex] ? (
                  <div className="animate-fadeIn flex flex-col items-center justify-center">
                    <span 
                      className="text-[10px] uppercase font-black tracking-wider truncate max-w-[120px] transition-colors"
                      style={{ color: pieChartData[activeIndex].color }}
                    >
                      {pieChartData[activeIndex].name}
                    </span>
                    <span className="text-sm font-black text-white mt-0.5 block font-mono">
                      {formatCurrency(pieChartData[activeIndex].value)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300 font-mono mt-1 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-white/5 shadow-md">
                      {((pieChartData[activeIndex].value / totalExpenseInMonth) * 100).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="animate-fadeIn flex flex-col items-center justify-center">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#888888]">
                      Total Pago
                    </span>
                    <span className="text-sm font-black text-white font-sans mt-0.5 block">
                      {formatCurrency(totalExpenseInMonth)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* LISTA DE PROGRESSO / RANKING FINTECH */
          <div className="flex-1 overflow-y-auto max-h-[235px] pr-1 space-y-3 scrollbar-thin animate-fadeIn">
            {[...pieChartData]
              .sort((a, b) => b.value - a.value)
              .map((item, idx) => {
                const pct = totalExpenseInMonth > 0 ? ((item.value / totalExpenseInMonth) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="space-y-1 group">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 truncate font-sans text-[11px] group-hover:text-white transition-colors">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
                        <span className="text-white font-bold">{formatCurrency(item.value)}</span>
                        <span className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded font-extrabold">{pct}%</span>
                      </div>
                    </div>
                    {/* Barra de Progresso com Transição Suave */}
                    <div className="w-full h-1.5 bg-zinc-900/80 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          backgroundColor: item.color,
                          width: `${pct}%`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* GRÁFICO 3: EVOLUÇÃO TEMPORAL MENSAL (12 COLS - Bento Grid Accent) */}
      <div className="lg:col-span-12 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col h-[210px]" id="history-area-chart-container">
        <div className="flex items-center gap-2 mb-3.5 shrink-0">
          <div className="p-1 px-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
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
