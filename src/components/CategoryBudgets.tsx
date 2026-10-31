import { PrivateValue, PrivateAmountInput } from './PrivateValue';
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Sliders, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Flame, 
  PieChart as PieIcon, 
  List,
  DollarSign
} from 'lucide-react';
import { CategoryBudget } from '../types';
import { formatCurrency } from '../utils/format';
import { categoryBudgetUsage, getCategoryColor } from '../utils/categories';
import { useChartEntrance } from '../hooks/useChartEntrance';

interface CategoryBudgetsProps {
  categoryBudgets: CategoryBudget[];
  expensesByCategory: Record<string, number>;
  onUpdateBudgets: (updatedBudgets: CategoryBudget[]) => void;
}

export interface CategoryBudgetsHandle {
  openLimits: () => void;
}

export const CategoryBudgets = forwardRef<CategoryBudgetsHandle, CategoryBudgetsProps>(function CategoryBudgets({
  categoryBudgets,
  expensesByCategory,
  onUpdateBudgets,
}, ref) {
  const [distView, setDistView] = useState<'donut' | 'bars'>('donut');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localLimits, setLocalLimits] = useState<Record<string, string>>({});

  // Calculate sum of all category ideal limits
  const totalCategoryLimits = categoryBudgets.reduce((sum, b) => sum + (b.idealLimit || 0), 0);

  // Live total category limit as edited in modal
  const liveModalTotalCategoryLimits = categoryBudgets.reduce((sum, b) => {
    const rawVal = localLimits[b.category];
    const val = rawVal !== undefined ? parseFloat(rawVal) : b.idealLimit;
    return sum + (!isNaN(val) && val >= 0 ? val : 0);
  }, 0);

  // Gather Pie Chart details (Categories with positive values)
  // Hover changes only the active slice; keep the data stable so its animation doesn't restart.
  const pieChartData = useMemo(() => Object.keys(expensesByCategory)
    .map(cat => {
      const val = expensesByCategory[cat];
      return {
        name: cat,
        value: parseFloat(val.toFixed(2)),
        color: getCategoryColor(cat),
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value), [expensesByCategory]);

  const totalExpenseInMonth = pieChartData.reduce((sum, item) => sum + item.value, 0);
  const entrance = useChartEntrance(pieChartData.length > 0);

  // Setup modal with existing budget limits
  const handleOpenModal = () => {
    const limits: Record<string, string> = {};
    categoryBudgets.forEach(b => {
      limits[b.category] = b.idealLimit.toString();
    });
    setLocalLimits(limits);
    setIsModalOpen(true);
  };
  useImperativeHandle(ref, () => ({ openLimits: handleOpenModal }));

  // Save all modified limits
  const handleSaveAllLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBudgets = categoryBudgets.map(b => {
      const rawVal = localLimits[b.category];
      const newVal = rawVal !== undefined ? parseFloat(rawVal) : b.idealLimit;
      return {
        category: b.category,
        idealLimit: !isNaN(newVal) && newVal >= 0 ? newVal : b.idealLimit
      };
    });
    onUpdateBudgets(updatedBudgets);
    setIsModalOpen(false);
  };

  return (
    <div className="sereno-panel sereno-distribution" id="category-budgets-card">
      <div className="sereno-section-heading"><h2>Para onde foi</h2></div>
      <div className="sereno-distribution-body">
      {pieChartData.length === 0 ? <p className="sereno-empty">Ainda não há despesas neste mês. Adicione uma despesa para ver a distribuição.</p> : <>
        {distView === 'donut' && <div className="sereno-donut-figure" role="group" tabIndex={0} aria-label="Distribuição de despesas por categoria. Use as setas para consultar valores e percentuais." onPointerLeave={e => { if (e.pointerType === 'mouse') setActiveIndex(null); }} onBlur={e => { if (e.target === e.currentTarget) setActiveIndex(null); }} onKeyDown={e => {
          entrance.finish();
          if (e.key === 'Escape') setActiveIndex(null);
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            setActiveIndex(current => e.key === 'Home' ? 0 : e.key === 'End' ? pieChartData.length - 1 : current === null ? (e.key === 'ArrowRight' ? 0 : pieChartData.length - 1) : (current + (e.key === 'ArrowRight' ? 1 : -1) + pieChartData.length) % pieChartData.length);
          }
        }}>
          <ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer={false}><Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="68%" outerRadius="92%" paddingAngle={1.5} stroke="none" isAnimationActive={entrance.isEntering} animationBegin={0} animationDuration={950} animationEasing="ease-out" onMouseEnter={(_, index) => { entrance.finish(); setActiveIndex(index); }} onClick={(_, index) => { entrance.finish(); setActiveIndex(index); }}>
            {pieChartData.map((item, index) => <Cell key={item.name} fill={item.color} opacity={1} stroke={index === activeIndex ? 'var(--sereno-ink)' : 'none'} strokeWidth={index === activeIndex ? 2 : 0} />)}
          </Pie></PieChart></ResponsiveContainer>
          <div className="sereno-donut-center" aria-live="polite"><span>{activeIndex !== null && pieChartData[activeIndex] ? pieChartData[activeIndex].name : 'Total de despesas'}</span><PrivateValue as="strong" className="privacy-value">{formatCurrency(activeIndex !== null && pieChartData[activeIndex] ? pieChartData[activeIndex].value : totalExpenseInMonth)}</PrivateValue>{activeIndex !== null && pieChartData[activeIndex] && <small>{(pieChartData[activeIndex].value / totalExpenseInMonth * 100).toFixed(1).replace('.', ',')}%</small>}</div>
        </div>}
        {distView === 'bars' && <div className="sereno-category-legend">{pieChartData.map((item, index) => <button type="button" key={item.name} aria-pressed={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} onClick={() => setActiveIndex(index)}>
          <i style={{ backgroundColor: item.color }} /><span className="sereno-category-name">{item.name}</span><PrivateValue as="span" className="privacy-value sereno-category-amount">{formatCurrency(item.value)}</PrivateValue><span className="sereno-category-percent">{(item.value / totalExpenseInMonth * 100).toFixed(1).replace('.', ',')}%</span>
        </button>)}</div>}
      </>}
      </div>
      <div className="sereno-chart-actions sereno-distribution-actions" role="group" aria-label="Visualização das categorias">
        <button type="button" aria-label="Ver gráfico de categorias" aria-pressed={distView === 'donut'} onClick={() => { setDistView('donut'); setActiveIndex(null); }}><PieIcon size={17} /></button>
        <button type="button" aria-label="Ver lista de categorias" aria-pressed={distView === 'bars'} onClick={() => { setDistView('bars'); setActiveIndex(null); }}><List size={17} /></button>
      </div>
      {/* FULLSCREEN DIMMED MODAL FOR CATEGORY LIMITS CONFIGURATION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div 
            className="bg-[#141414] border border-white/10 max-w-lg w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]" 
            id="budget-modal-surface"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Teto de Gastos Adotado</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Configure limites mensais recomendados para cada setor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Limits Config List */}
            <form onSubmit={handleSaveAllLimits} className="flex-grow flex flex-col min-h-0">
              {/* Real-time Total Category Ceiling Banner */}
              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 mb-3 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block truncate">
                      Teto Total Estipulado (Somatória)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium truncate block">
                      Soma de todas as metas individuais de gastos das categorias
                    </span>
                  </div>
                </div>
                <PrivateValue as="div" className="text-right font-mono font-black text-sm sm:text-base text-indigo-300 privacy-value shrink-0">
                  {formatCurrency(liveModalTotalCategoryLimits)}
                </PrivateValue>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin max-h-[50vh] py-1">
                {categoryBudgets.map((budget) => {
                  const spent = expensesByCategory[budget.category] || 0;
                  const categoryColor = getCategoryColor(budget.category);
                  const currentLimitValue = localLimits[budget.category] || '0';
                  const limit = parseFloat(currentLimitValue) || 0;
                  const usage = categoryBudgetUsage(spent, limit);
                  const percent = usage.percentage === null ? 0 : Math.round(usage.percentage);

                  let statusText = 'OK';
                  let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  let statusIcon = <CheckCircle className="w-3.5 h-3.5" />;

                  if (spent > limit && limit > 0) {
                    statusText = 'Estourou!';
                    statusColor = 'text-rose-450 bg-rose-500/10 border-rose-500/20';
                    statusIcon = <Flame className="w-3.5 h-3.5" />;
                  } else if (spent >= limit * 0.8 && limit > 0) {
                    statusText = 'Crítico';
                    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                    statusIcon = <AlertTriangle className="w-3.5 h-3.5" />;
                  }

                  return (
                    <div 
                      key={budget.category} 
                      className="p-3.5 rounded-xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/50 transition-colors flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Sector identifier */}
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                          <span className="font-extrabold text-[#f1f1f1] text-[11px]">{budget.category}</span>
                        </div>
                        {/* Real spent status display */}
                        <div className="text-right text-[10px] font-semibold text-slate-400">
                          Gasto Real: <PrivateValue as="span" className="text-white privacy-value font-bold font-mono">{formatCurrency(spent)}</PrivateValue>
                        </div>
                      </div>

                      {/* Inputs row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Teto Máximo (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 font-mono">
                              R$
                            </span>
                            <PrivateAmountInput
                              type="number"
                              aria-label={`Limite de ${budget.category}`}
                              placeholder="Sem teto"
                              value={localLimits[budget.category] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLocalLimits(prev => ({
                                  ...prev,
                                  [budget.category]: val,
                                }));
                              }}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold font-mono border border-white/10 bg-zinc-950 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all privacy-value"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        {/* Recommendation bar */}
                        <div className="pt-2 sm:pt-0">
                          {limit > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className={`px-1.5 py-0.5 rounded-full border text-[8px] font-bold flex items-center gap-0.5 ${statusColor}`}>
                                  {statusIcon} {statusText}
                                </span>
                                <span className="font-mono text-slate-350">{percent}% comprometido</span>
                              </div>
                              <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${spent > limit ? 'bg-rose-500' : spent >= limit * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${usage.fillPercentage ?? 0}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-500 italic text-center sm:text-left pt-3">
                              Nenhum limite estabelecido para este setor
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save / Close Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-white bg-zinc-900/40 hover:bg-zinc-900 rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
