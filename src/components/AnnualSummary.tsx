import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Coins, 
  ArrowUpRight, 
  Calendar,
  BarChart3,
  Sliders,
  DollarSign
} from 'lucide-react';
import { Expense, Revenue } from '../types';
import { formatCurrency } from '../utils/format';
import { CATEGORY_COLORS } from '../utils/storage';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface AnnualSummaryProps {
  expenses: Expense[];
  revenues: Revenue[];
  selectedYear: string; // e.g. "2026"
}

export const AnnualSummary: React.FC<AnnualSummaryProps> = ({
  expenses,
  revenues,
  selectedYear,
}) => {
  const monthsList = [
    { num: '01', name: 'Jan' },
    { num: '02', name: 'Fev' },
    { num: '03', name: 'Mar' },
    { num: '04', name: 'Abr' },
    { num: '05', name: 'Mai' },
    { num: '06', name: 'Jun' },
    { num: '07', name: 'Jul' },
    { num: '08', name: 'Ago' },
    { num: '09', name: 'Set' },
    { num: '10', name: 'Out' },
    { num: '11', name: 'Nov' },
    { num: '12', name: 'Dez' },
  ];

  const [displayYear, setDisplayYear] = useState<string>(selectedYear);

  useEffect(() => {
    setDisplayYear(selectedYear);
  }, [selectedYear]);

  // Dynamically calculate which years have recorded items so users can swap back/forth
  const uniqueYears = useMemo(() => {
    const years = new Set<string>();
    
    // Scan expenses
    expenses.forEach(e => {
      if (e.month) {
        const yr = e.month.split('-')[0];
        if (yr && yr.length === 4) years.add(yr);
      }
    });

    // Scan revenues
    revenues.forEach(r => {
      if (r.month) {
        const yr = r.month.split('-')[0];
        if (yr && yr.length === 4) years.add(yr);
      }
    });

    years.add(selectedYear);
    years.add(new Date().getFullYear().toString());

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [expenses, revenues, selectedYear]);

  // Filter year data based on displayYear
  const yearExpenses = expenses.filter(e => e.month.startsWith(displayYear));
  const yearRevenues = revenues.filter(r => r.month.startsWith(displayYear));

  // Totals
  const totalRevenues = yearRevenues.reduce((sum, r) => sum + r.value, 0);
  const totalExpenses = yearExpenses.reduce((sum, e) => sum + e.value, 0);
  const netSavings = totalRevenues - totalExpenses;
  const savingsPct = totalRevenues > 0 ? Math.round((netSavings / totalRevenues) * 100) : 0;

  // Monthly timeline aggregation
  const monthlyData = monthsList.map(m => {
    const monthKey = `${displayYear}-${m.num}`;
    const monthlyExps = yearExpenses.filter(e => e.month === monthKey);
    const monthlyRevs = yearRevenues.filter(r => r.month === monthKey);

    const revSum = monthlyRevs.reduce((sum, r) => sum + r.value, 0);
    const expSum = monthlyExps.reduce((sum, e) => sum + e.value, 0);
    const saved = revSum - expSum;
    const rate = revSum > 0 ? Math.round((saved / revSum) * 100) : 0;

    return {
      monthLabel: m.name,
      monthKey,
      Entradas: revSum,
      Saídas: expSum,
      Saldo: saved,
      TaxaPoupanca: rate,
    };
  });

  // Calculate annual active months (months with entries/expenses)
  const activeMonths = monthlyData.filter(d => d.Entradas > 0 || d.Saídas > 0).length || 1;
  const avgMonthlyExpense = totalExpenses / activeMonths;

  // Spends by category accumulated in the year
  const categorySpendsObj = yearExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {} as Record<string, number>);

  const categorySpendsArr = Object.entries(categorySpendsObj)
    .map(([category, value]) => ({
      category,
      value: value as number,
      color: CATEGORY_COLORS[category] || '#6B7280',
    }))
    .sort((a, b) => (b.value as number) - (a.value as number));

  // Custom tooltips for graphs
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#121212] border border-white/10 p-2.5 rounded-xl shadow-lg">
          <p className="text-xs font-bold text-slate-300 mb-1">{payload[0].payload.monthLabel}</p>
          {payload.map((item: any, index: number) => {
            const isRevenue = item.name === 'Entradas';
            const valueColor = isRevenue ? 'text-emerald-400' : 'text-indigo-400';
            return (
              <div key={index} className="flex justify-between items-center gap-4 text-[10px] my-0.5">
                <span className="text-slate-500 font-semibold">{item.name}:</span>
                <span className={`font-mono font-bold privacy-blur ${valueColor}`}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 animate-fade-in" id="annual-summary-root">
      
      {/* SEÇÃO SUPERIOR: TÍTULO COM INDICATIVO DO ANO COM SELECT PICKER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3.5 gap-3" id="annual-header">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <Coins className="w-4 h-4 text-amber-500" />
            Consolidado Anual de {displayYear}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Dados do ano base {displayYear}, integrando todas as tabelas mensais</p>
        </div>
        <div className="flex items-center gap-2" id="annual-year-picker-container">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="annual-year-select">
            Exibir Ano Fiscal:
          </label>
          <select
            id="annual-year-select"
            value={displayYear}
            onChange={(e) => setDisplayYear(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-white font-mono font-bold text-xs sm:text-[13px] focus:outline-none focus:border-amber-500 cursor-pointer hover:border-white/20 transition-all"
          >
            {uniqueYears.map(yr => (
              <option key={yr} value={yr} className="bg-zinc-950 text-white font-mono">
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* QUADRO DE KPI ANUAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="annual-kpi-grid">
        {/* Card 1: Renda Anual */}
        <div className="bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xs" id="annual-kpi-revenues">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-bold text-slate-300 uppercase tracking-wider">Rendimentos Totais ({displayYear})</span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 animate-pulse">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-white font-sans tracking-tight privacy-blur">
              {formatCurrency(totalRevenues)}
            </span>
            <span className="text-xs sm:text-[13px] text-slate-400 block mt-1 leading-none font-medium">
              Média mensal recebida: <span className="font-mono text-slate-300 font-bold privacy-blur">{formatCurrency(totalRevenues / 12)}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Despesas Anuais */}
        <div className="bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xs" id="annual-kpi-expenses">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-bold text-slate-300 uppercase tracking-wider">Despesas Totais ({displayYear})</span>
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/10">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-white font-sans tracking-tight privacy-blur">
              {formatCurrency(totalExpenses)}
            </span>
            <span className="text-xs sm:text-[13px] text-slate-400 block mt-1 leading-none font-medium">
              Comprometido anual: <span className="font-mono text-slate-300 font-bold privacy-blur">{formatCurrency(avgMonthlyExpense)}/mês</span>
            </span>
          </div>
        </div>

        {/* Card 3: Saldo Líquido de Poupança */}
        <div className="bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xs" id="annual-kpi-saved">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-bold text-slate-300 uppercase tracking-wider">Poupança Acumulada</span>
            <div className={`p-1 rounded-lg ${netSavings >= 0 ? 'bg-emerald-555/10 text-emerald-400 border-emerald-500/10' : 'bg-rose-500/10 text-rose-455 border-rose-500/10'}`}>
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-lg sm:text-xl lg:text-2xl font-extrabold font-sans tracking-tight privacy-blur ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
            </span>
            <span className="text-xs sm:text-[13px] text-slate-400 block mt-1 leading-none font-medium">
              {netSavings >= 0 ? 'Resultado financeiro superavitário' : 'Orçamento deficitário no período'}
            </span>
          </div>
        </div>

        {/* Card 4: Taxa de Poupança Geral */}
        <div className="bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xs" id="annual-kpi-rate">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-bold text-slate-300 uppercase tracking-wider">Índice de Poupança Geral</span>
            <div className="p-1 rounded-lg bg-indigo-550/10 text-indigo-400 border border-indigo-500/10">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-lg sm:text-xl lg:text-2xl font-extrabold font-mono tracking-tight ${savingsPct >= 20 ? 'text-emerald-400' : savingsPct > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>
              {savingsPct}% Poupado
            </span>
            <span className="text-xs sm:text-[13px] text-slate-400 block mt-1 leading-none font-medium">
              Meta ideal sugerida pelo app: <span className="text-slate-200 font-bold">20%</span>
            </span>
          </div>
        </div>
      </div>

      {/* GRAPHIC AND STATS AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" id="annual-charts-grid">
        
        {/* GRÁFICO DE EVOLUÇÃO DAS ENTRADAS x SAÍDAS */}
        <div className="lg:col-span-8 bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 flex flex-col h-[320px]" id="annual-trend-chart">
          <div className="flex items-center gap-2 mb-3.5 shrink-0">
            <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-[13.5px] font-bold text-white">Cronograma Comparativo Trimestral / Mensal</h3>
              <p className="text-xs text-slate-400 mt-0.5">Fluxos de caixa consolidados ao longo dos meses aplicados</p>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', paddingTop: 6 }} />
                <Bar dataKey="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Saídas" fill="#312e81" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Line type="monotone" dataKey="Saldo" stroke="#818cf8" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACUMULADO POR CATEGORIA NO ANO */}
        <div className="lg:col-span-4 bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 flex flex-col h-[320px]" id="annual-category-summary">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="p-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/10">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-[13.5px] font-bold text-white">Maiores Gastos do Ano</h3>
              <p className="text-xs text-slate-400 mt-0.5">Soma total desembolsada por setor</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin" id="annual-cat-list">
            {categorySpendsArr.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-550">
                <Calendar className="w-7 h-7 text-zinc-800 stroke-1 mb-1.5" />
                <p className="font-semibold text-xs sm:text-[13px] text-slate-450">Sem dados registrados</p>
                <p className="text-xs text-slate-500 mt-0.5">As despesas adicionadas no mês aparecerão aqui agrupadas.</p>
              </div>
            ) : (
              categorySpendsArr.map((item) => {
                const percent = totalExpenses > 0 ? Math.round((item.value / totalExpenses) * 100) : 0;
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs sm:text-[13px]">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200 truncate max-w-[140px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.category}</span>
                      </div>
                      <div className="text-right font-mono text-[11px] sm:text-xs text-slate-400">
                        <span className="font-bold text-slate-250 privacy-blur">{formatCurrency(item.value)}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 ml-1">({percent}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* TABELA DE DEMONSTRAÇÃO COMPACTA MES A MES (DRE COMPACTO ANUAL) */}
      <div className="bg-[#161616] rounded-2xl border border-white/5 p-4 sm:p-5 text-white" id="annual-monthly-table-card">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-xs sm:text-[14px] font-black text-white uppercase tracking-wider">Demonstrativo de Fluxo Mensal ({displayYear})</h3>
            <p className="text-xs text-slate-400 mt-0.5">Consolidado com dados e taxas de retenção por competência</p>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 font-mono">12 competências</span>
        </div>

        <div className="overflow-x-auto" id="annual-table-container">
          <table className="w-full text-left border-collapse" id="annual-dre-table">
            <thead>
              <tr className="border-b border-white/5 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400 bg-white/[0.01]">
                <th className="py-3 px-3">Mês</th>
                <th className="py-3 px-3 text-right">Rendimentos (+)</th>
                <th className="py-3 px-3 text-right">Despesas (-)</th>
                <th className="py-3 px-3 text-right">Saldo Líquido (=)</th>
                <th className="py-3 px-3 text-right">Retenção (%)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-[13px] font-semibold text-slate-300">
              {monthlyData.map((dataRow) => {
                const isZero = dataRow.Entradas === 0 && dataRow.Saídas === 0;
                
                let balanceColor = 'text-slate-400';
                if (!isZero) {
                  balanceColor = dataRow.Saldo >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
                }

                let statusBadge = <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-zinc-400 bg-zinc-950/40 border border-white/5">Inativo</span>;
                if (!isZero) {
                  if (dataRow.Saldo > 0) {
                    statusBadge = <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/10">Poupou</span>;
                  } else if (dataRow.Saldo === 0) {
                    statusBadge = <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300 bg-[#252525] border border-white/10 text-center">Zero</span>;
                  } else {
                    statusBadge = <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15">Estourou</span>;
                  }
                }

                return (
                  <tr key={dataRow.monthKey} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-white font-bold">{dataRow.monthLabel}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold text-xs sm:text-[13.5px]">
                      {dataRow.Entradas > 0 ? <span className="privacy-blur">{formatCurrency(dataRow.Entradas)}</span> : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300 text-xs sm:text-[13px]">
                      {dataRow.Saídas > 0 ? <span className="privacy-blur">{formatCurrency(dataRow.Saídas)}</span> : '-'}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono text-xs sm:text-[13px] ${balanceColor}`}>
                      {isZero ? '-' : <span className="privacy-blur">{formatCurrency(dataRow.Saldo)}</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-xs sm:text-[13px]">
                      {isZero ? '-' : `${dataRow.TaxaPoupanca}%`}
                    </td>
                    <td className="py-3 px-3 text-center">{statusBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
