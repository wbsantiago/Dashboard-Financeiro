import React, { useState } from 'react';
import { Edit2, Check, X, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
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
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleStartEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setEditValue(currentLimit.toString());
  };

  const handleSaveEdit = (category: string) => {
    const value = parseFloat(editValue);
    if (!isNaN(value) && value >= 0) {
      onUpdateBudget(category, value);
      setEditingCategory(null);
    } else {
      alert('Por favor, insira um valor válido maior ou igual a zero.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 shadow-xs flex flex-col h-full overflow-hidden animate-fade-in" id="category-budgets-card">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">Teto de Gastos Adotado</h3>
          <p className="text-[10px] text-slate-400 font-medium">Gerencie limites recomendados para cada setor</p>
        </div>
      </div>

      <div className="space-y-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin" id="category-budgets-list">
        {categoryBudgets.map((budget) => {
          const spent = expensesByCategory[budget.category] || 0;
          const limit = budget.idealLimit;
          const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : spent > 0 ? 100 : 0;
          
          let statusColor = 'text-emerald-400 bg-emerald-500/10';
          let borderStatusColor = 'border-emerald-500/20';
          let statusText = 'OK';
          let statusIcon = <CheckCircle className="w-3.5 h-3.5" />;
          let barProgressColor = 'bg-emerald-500';

          if (spent > limit) {
            statusColor = 'text-rose-400 bg-rose-500/10 animate-pulse';
            borderStatusColor = 'border-rose-500/20';
            statusText = 'Estourou!';
            statusIcon = <Flame className="w-3.5 h-3.5" />;
            barProgressColor = 'bg-rose-500';
          } else if (spent >= limit * 0.8) {
            statusColor = 'text-amber-400 bg-amber-500/10';
            borderStatusColor = 'border-amber-500/20';
            statusText = 'Limite Próximo';
            statusIcon = <AlertTriangle className="w-3.5 h-3.5" />;
            barProgressColor = 'bg-amber-500';
          }

          const categoryColor = CATEGORY_COLORS[budget.category] || '#6b7280';

          return (
            <div 
              key={budget.category} 
              className="p-2.5 rounded-xl border border-white/5 hover:bg-white/5 transition-colors duration-150"
              id={`budget-row-${budget.category}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                {/* Categoria e Status */}
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: categoryColor }}
                  />
                  <span className="font-bold text-white text-xs">{budget.category}</span>
                  
                  {limit > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5 border ${statusColor} ${borderStatusColor}`}>
                      {statusIcon}
                      {statusText}
                    </span>
                  )}
                </div>

                {/* Edição e Valores */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {editingCategory === budget.category ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">R$</span>
                      <input
                        type="number"
                        className="w-16 px-1.5 py-0.5 text-[10px] font-semibold border border-white/15 bg-zinc-900 text-white rounded focus:border-indigo-500 outline-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        step="50"
                        min="0"
                        id={`input-budget-${budget.category}`}
                      />
                      <button
                        onClick={() => handleSaveEdit(budget.category)}
                        className="p-1 text-emerald-400 hover:bg-white/5 rounded"
                        title="Salvar"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-rose-450 hover:bg-white/5 rounded"
                        title="Cancelar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="text-right">
                        <div className="text-[10px] font-medium text-slate-500">
                          Meta: <span className="font-semibold text-slate-300 privacy-blur">{formatCurrency(limit)}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-200">
                          Gasto: <span className="privacy-blur">{formatCurrency(spent)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartEdit(budget.category, limit)}
                        className="p-1 text-slate-550 hover:text-indigo-400 hover:bg-white/5 rounded transition-colors"
                        title="Editar limite"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Progresso */}
              {limit > 0 ? (
                <div>
                  <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${barProgressColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                    <span>{percent}% comprometido</span>
                    <span>Restante: <span className="privacy-blur">{formatCurrency(Math.max(0, limit - spent))}</span></span>
                  </div>
                </div>
              ) : (
                <div className="text-[9px] text-slate-500 italic flex items-center justify-between">
                  <span>Sem teto configurado</span>
                  <button 
                    onClick={() => handleStartEdit(budget.category, limit)}
                    className="text-[9px] text-indigo-400 font-bold hover:underline"
                  >
                    Ativar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
