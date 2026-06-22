import React, { useState } from 'react';
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
import { CATEGORY_COLORS } from '../utils/storage';

interface CategoryBudgetsProps {
  categoryBudgets: CategoryBudget[];
  expensesByCategory: Record<string, number>;
  onUpdateBudget: (category: string, idealLimit: number) => void;
}

export const CategoryBudgets: React.FC<CategoryBudgetsProps> = ({
  categoryBudgets,
  expensesByCategory,
  onUpdateBudget,
}) => {
  const [distView, setDistView] = useState<'donut' | 'bars'>('donut');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localLimits, setLocalLimits] = useState<Record<string, string>>({});

  // Gather Pie Chart details (Categories with positive values)
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

  // Setup modal with existing budget limits
  const handleOpenModal = () => {
    const limits: Record<string, string> = {};
    categoryBudgets.forEach(b => {
      limits[b.category] = b.idealLimit.toString();
    });
    setLocalLimits(limits);
    setIsModalOpen(true);
  };

  // Save all modified limits
  const handleSaveAllLimits = (e: React.FormEvent) => {
    e.preventDefault();
    categoryBudgets.forEach(b => {
      const rawVal = localLimits[b.category];
      const newVal = rawVal !== undefined ? parseFloat(rawVal) : b.idealLimit;
      if (!isNaN(newVal) && newVal >= 0) {
        onUpdateBudget(b.category, newVal);
      }
    });
    setIsModalOpen(false);
  };

  return (
    <div 
      className="bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex flex-col lg:h-[569px] overflow-hidden" 
      id="category-budgets-card"
    >
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 px-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/10 shrink-0">
            <PieIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">Distribuição por Categoria</h3>
            <p className="text-[10px] text-slate-400 font-medium truncate">Mês Corrente</p>
          </div>
        </div>

        {/* ACTIONS CONTAINER */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Donut vs Bars View Toggle */}
          {pieChartData.length > 0 && (
            <div className="flex bg-[#111111] border border-white/5 p-0.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setDistView('donut')}
                className={`p-1 px-1.5 rounded-lg text-[9px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  distView === 'donut'
                    ? 'bg-zinc-800 text-pink-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em Gráfico de Pizza"
              >
                <PieIcon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDistView('bars')}
                className={`p-1 px-1.5 rounded-lg text-[9px] uppercase font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  distView === 'bars'
                    ? 'bg-zinc-800 text-pink-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em Lista de Progresso"
              >
                <List className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Edit / Config limits button */}
          <button
            type="button"
            onClick={handleOpenModal}
            className="p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 transition-colors flex items-center justify-center cursor-pointer font-bold text-[10px] gap-1 shrink-0"
            title="Ajustar Tetos de Gastos"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden xs:inline uppercase tracking-wider">Ajustar Tetos</span>
          </button>
        </div>
      </div>

      {/* CORE GRAPHIC OR LIST SECTION */}
      <div className="flex-1 flex flex-col min-h-0 py-4 justify-center">
        {pieChartData.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-center text-slate-550 py-12">
            <p className="font-semibold text-slate-400">Nenhum dado financeiro</p>
            <p className="text-[10px] mt-0.5 text-slate-500">Registre despesas para ver a distribuição.</p>
          </div>
        ) : distView === 'donut' ? (
          <div className="flex-grow flex flex-col min-h-0 animate-fadeIn h-full justify-between">
             {/* Expanded Center Donut Graphic */}
            <div className="flex-grow w-full min-h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={100}
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
                            transition: 'all 0.15s ease-out',
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

              {/* Dynamic center interactive reading */}
              <div 
                className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center justify-center select-none w-full max-w-[210px]"
                id="donut-center-interactive-label"
              >
                {activeIndex !== null && pieChartData[activeIndex] ? (
                  <div className="animate-fadeIn flex flex-col items-center justify-center pb-1">
                    <span 
                      className="text-xs uppercase font-black tracking-wider truncate max-w-[190px] transition-colors"
                      style={{ color: pieChartData[activeIndex].color }}
                    >
                      {pieChartData[activeIndex].name}
                    </span>
                    <span className="text-lg md:text-xl font-black text-white mt-1 block font-mono privacy-blur">
                      {formatCurrency(pieChartData[activeIndex].value)}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-300 font-mono mt-1 bg-zinc-950/80 px-2 py-0.5 rounded border border-white/5 shadow-md">
                      {((pieChartData[activeIndex].value / totalExpenseInMonth) * 100).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="animate-fadeIn flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#888888]">
                      Total Pago
                    </span>
                    <span className="text-lg md:text-xl font-black text-white font-sans mt-0.5 block privacy-blur">
                      {formatCurrency(totalExpenseInMonth)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid-free, flexible wrapping elements below the donut to eliminate scroll bars entirely */}
            <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 mt-2.5 shrink-0 text-xs text-slate-305">
              {pieChartData.map((item, idx) => {
                const pct = ((item.value / totalExpenseInMonth) * 100).toFixed(0);
                return (
                  <div key={idx} className="flex items-center gap-1.5 font-bold text-slate-350 hover:text-slate-100 transition-colors">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-300 font-bold" title={item.name}>{item.name}</span>
                    <span className="font-mono font-bold text-slate-400 bg-zinc-900/40 px-1 py-0.5 rounded text-[10px] shrink-0 font-medium">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* FINTECH PROGRESS BARS LIST VIEW */
          <div className="flex-1 overflow-y-auto max-h-[440px] pr-1 space-y-3.5 scrollbar-thin animate-fadeIn">
            {[...pieChartData]
              .sort((a, b) => b.value - a.value)
              .map((item, idx) => {
                const pct = totalExpenseInMonth > 0 ? ((item.value / totalExpenseInMonth) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-200 truncate font-sans text-xs sm:text-[12.5px] group-hover:text-white transition-colors">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] sm:text-xs">
                        <span className="text-white font-bold privacy-blur">{formatCurrency(item.value)}</span>
                        <span className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded font-extrabold text-[10px]">{pct}%</span>
                      </div>
                    </div>
                    {/* Progress slider bar */}
                    <div className="w-full h-2 bg-zinc-900/80 rounded-full overflow-hidden border border-white/5">
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
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin max-h-[50vh] py-1">
                {categoryBudgets.map((budget) => {
                  const spent = expensesByCategory[budget.category] || 0;
                  const categoryColor = CATEGORY_COLORS[budget.category] || '#6b7280';
                  const currentLimitValue = localLimits[budget.category] || '0';
                  const limit = parseFloat(currentLimitValue) || 0;
                  const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : spent > 0 ? 100 : 0;

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
                          Gasto Real: <span className="text-white privacy-blur font-bold font-mono">{formatCurrency(spent)}</span>
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
                            <input
                              type="number"
                              placeholder="Sem teto"
                              value={localLimits[budget.category] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLocalLimits(prev => ({
                                  ...prev,
                                  [budget.category]: val,
                                }));
                              }}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold font-mono border border-white/10 bg-zinc-950 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                              min="0"
                              step="10"
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
                                  style={{ width: `${percent}%` }}
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
};
