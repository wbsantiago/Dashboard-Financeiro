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
  AreaChart,
  Area
} from 'recharts';
import { CategoryBudget, Expense } from '../types';
import { formatCurrency, formatShortMonthYear } from '../utils/format';
import { BarChart3, LineChart as LineIcon, Calendar, TrendingUp, HelpCircle } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');

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

  // Data for Timeline history chart (Monthly)
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

  // Data for Daily history of selectedMonth
  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const daysInMonth = isNaN(yearNum) || isNaN(monthNum) ? 30 : new Date(yearNum, monthNum, 0).getDate();

  const dailyChartData = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const dayStr = String(day).padStart(2, '0');
    const datePattern = `${selectedMonth}-${dayStr}`;
    
    // Sum values for this day
    const dayExpenses = expensesInMonth.filter(e => e.date === datePattern);
    const dayTotal = dayExpenses.reduce((sum, item) => sum + item.value, 0);
    
    return {
      dayNum: day,
      dayLabel: `${dayStr}/${monthStr}`,
      "Gasto do Dia": parseFloat(dayTotal.toFixed(2)),
    };
  });

  // Find day with most spending
  let topDay = { dayNum: 0, dayLabel: '-', amount: 0 };
  dailyChartData.forEach(d => {
    if (d["Gasto do Dia"] > topDay.amount) {
      topDay = {
        dayNum: d.dayNum,
        dayLabel: d.dayLabel,
        amount: d["Gasto do Dia"]
      };
    }
  });

  // Find week with most spending (Semana 1 to 5 grouping)
  const weeks = [
    { name: 'Semana 1', range: 'Dias 01 a 07', amount: 0 },
    { name: 'Semana 2', range: 'Dias 08 a 14', amount: 0 },
    { name: 'Semana 3', range: 'Dias 15 a 21', amount: 0 },
    { name: 'Semana 4', range: 'Dias 22 a 28', amount: 0 },
    { name: 'Semana 5', range: 'Dias 29+', amount: 0 },
  ];

  dailyChartData.forEach(d => {
    if (d.dayNum >= 1 && d.dayNum <= 7) {
      weeks[0].amount += d["Gasto do Dia"];
    } else if (d.dayNum >= 8 && d.dayNum <= 14) {
      weeks[1].amount += d["Gasto do Dia"];
    } else if (d.dayNum >= 15 && d.dayNum <= 21) {
      weeks[2].amount += d["Gasto do Dia"];
    } else if (d.dayNum >= 22 && d.dayNum <= 28) {
      weeks[3].amount += d["Gasto do Dia"];
    } else {
      weeks[4].amount += d["Gasto do Dia"];
    }
  });

  const activeWeeks = weeks.filter(w => w.amount > 0 || w.name !== 'Semana 5' || daysInMonth > 28);
  let topWeek = activeWeeks[0] || weeks[0];
  activeWeeks.forEach(w => {
    if (w.amount > topWeek.amount) {
      topWeek = w;
    }
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

      {/* GRÁFICO 2: EVOLUÇÃO TEMPORAL MENSAL E DIÁRIA (12 COLS - Bento Grid Accent) */}
      <div 
        className="lg:col-span-12 bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col min-h-[350px] lg:min-h-[360px]" 
        id="history-area-chart-container"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 px-1.5 rounded-lg bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/10">
              <LineIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Evolução de Gastos</h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {viewMode === 'monthly' 
                  ? 'Evolução mensal histórica acumulada de despesas' 
                  : `Visualização de gastos dia a dia para o mês de ${formatShortMonthYear(selectedMonth)}`}
              </p>
            </div>
          </div>

          {/* Segment control selector */}
          <div className="flex items-center gap-1 bg-zinc-950/40 p-1 rounded-xl border border-white/5 self-start sm:self-auto" id="charts-history-view-selector">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-[#22d3ee] text-zinc-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Histórico Mensal
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-[#22d3ee] text-zinc-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gastos deste Mês
            </button>
          </div>
        </div>

        {/* Chart body */}
        <div className="flex-1 w-full min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'monthly' ? (
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
            ) : (
              <AreaChart
                data={dailyChartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.00}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222222" />
                <XAxis 
                  dataKey="dayLabel" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 550 }} 
                  axisLine={false}
                  tickLine={false}
                  interval={daysInMonth > 20 ? 2 : 0}
                  tickFormatter={(tick) => tick.split('/')[0]}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomCurrencyTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="Gasto do Dia" 
                  stroke="#818cf8" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDaily)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Informações de Destaques de Gastos Diários/Semanais */}
        {viewMode === 'daily' && (
          <div className="mt-4 pt-3.5 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0" id="charts-history-insights">
            {/* CARD 1: Dia com mais gastos */}
            <div className="flex items-center gap-3 bg-zinc-950/35 p-2.5 rounded-xl border border-white/5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dia com mais gastos</span>
                <span className="block text-xs text-white font-bold truncate mt-0.5">
                  {topDay.amount > 0 ? (
                    <>
                      Dia {topDay.dayLabel.split('/')[0]} • <span className="font-mono text-indigo-400">{formatCurrency(topDay.amount)}</span>
                    </>
                  ) : (
                    'Nenhum gasto registrado'
                  )}
                </span>
              </div>
            </div>

            {/* CARD 2: Semana com mais gastos */}
            <div className="flex items-center gap-3 bg-zinc-950/35 p-2.5 rounded-xl border border-white/5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Semana mais movimentada</span>
                <span className="block text-xs text-white font-bold truncate mt-0.5">
                  {topWeek.amount > 0 ? (
                    <>
                      {topWeek.name} ({topWeek.range}) • <span className="font-mono text-emerald-400">{formatCurrency(topWeek.amount)}</span>
                    </>
                  ) : (
                    'Nenhuma semana com gastos'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
