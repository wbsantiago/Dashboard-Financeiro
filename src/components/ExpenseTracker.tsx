import React, { useState } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Search, 
  CreditCard, 
  Calendar, 
  HelpCircle, 
  TrendingUp,
  PiggyBank,
  ArrowUpRight,
  TrendingDown,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import { Expense, Revenue } from '../types';
import { formatCurrency, formatDate, getInstallmentInfo } from '../utils/format';
import { 
  DEFAULT_CATEGORIES, 
  CATEGORY_COLORS, 
  DEFAULT_REVENUE_CATEGORIES, 
  REVENUE_CATEGORY_COLORS 
} from '../utils/storage';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expenseData: Omit<Expense, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (id: string, updatedData: Partial<Omit<Expense, 'id' | 'createdAt'>>) => void;
  revenues: Revenue[];
  onAddRevenue: (revenueData: Omit<Revenue, 'id' | 'createdAt'>) => void;
  onDeleteRevenue: (id: string) => void;
  selectedMonth: string;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  onUpdateExpense,
  revenues,
  onAddRevenue,
  onDeleteRevenue,
  selectedMonth,
}) => {
  // Navigation Tabs at top: expenses (Saídas) or revenues (Entradas)
  const [activeTab, setActiveTab] = useState<'expenses' | 'revenues'>('expenses');

  // State to handle delete confirmation modal
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'expense' | 'revenue'; title: string; isInstallment?: boolean } | null>(null);

  // FILTERS (Expenses)
  const [filterType, setFilterType] = useState<'all' | 'one-time' | 'installment'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // FILTERS (Revenues)
  const [revenueSearchTerm, setRevenueSearchTerm] = useState<string>('');
  const [filterRevenueCategory, setFilterRevenueCategory] = useState<string>('all');

  // FORM STATE (Expenses)
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [firstInstallmentNextMonth, setFirstInstallmentNextMonth] = useState(false);
  const [installmentValueType, setInstallmentValueType] = useState<'total' | 'single'>('single');

  // Calculate dynamic months based on the selected date for the card "virou" questions
  const getMonthsLabels = () => {
    try {
      if (!date) return { current: 'Este mês', next: 'Próximo mês' };
      const [yearStr, monthStr] = date.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      
      const ptMonths = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      const currentName = ptMonths[m - 1] || 'Este mês';
      const curLabel = `${currentName}/${yearStr}`;
      
      const nextMonthDate = new Date(y, m, 1);
      const nextName = ptMonths[nextMonthDate.getMonth()];
      const nextYear = nextMonthDate.getFullYear();
      const nexLabel = `${nextName}/${nextYear}`;
      
      return { current: curLabel, next: nexLabel };
    } catch {
      return { current: 'Este mês', next: 'Próximo mês' };
    }
  };

  const monthLabels = getMonthsLabels();

  // EDIT STATE (Expenses)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
  const [editDate, setEditDate] = useState('');

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setEditTitle(exp.title);
    setEditValue(exp.value.toString());
    setEditDate(exp.date);
    if (DEFAULT_CATEGORIES.includes(exp.category)) {
      setEditCategory(exp.category);
      setIsEditCustomCategory(false);
    } else {
      setEditCategory('CUSTOM');
      setEditCustomCategory(exp.category);
      setIsEditCustomCategory(true);
    }
  };

  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    const parsedValue = parseFloat(editValue);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      alert('Por favor, informe um valor maior que zero.');
      return;
    }

    if (!editTitle.trim()) {
      alert('Por favor, informe uma descrição.');
      return;
    }

    const finalCategory = isEditCustomCategory ? editCustomCategory.trim() : editCategory;
    if (!finalCategory) {
      alert('Por favor, informe a categoria.');
      return;
    }

    onUpdateExpense(editingExpense.id, {
      title: editTitle.trim(),
      value: parsedValue,
      category: finalCategory,
      date: editDate,
    });

    setEditingExpense(null);
  };

  // FORM STATE (Revenues)
  const [revTitle, setRevTitle] = useState('');
  const [revValue, setRevValue] = useState('');
  const [revCategory, setRevCategory] = useState(DEFAULT_REVENUE_CATEGORIES[0]);
  const [customRevCategory, setCustomRevCategory] = useState('');
  const [isCustomRevCategory, setIsCustomRevCategory] = useState(false);
  const [revDate, setRevDate] = useState(new Date().toISOString().split('T')[0]);

  // CATEGORIES LISTS FOR FILTER DROPDOWNS
  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category)));
  const uniqueRevenueCategories = Array.from(new Set(revenues.map(r => r.category)));

  // FILTER LOGIC FOR EXPENSES
  const filteredExpenses = expenses.filter(exp => {
    if (exp.month !== selectedMonth) return false;
    
    const info = getInstallmentInfo(exp);
    const isInst = exp.isInstallment || info.hasInfo;
    
    if (filterType === 'one-time' && isInst) return false;
    if (filterType === 'installment' && !isInst) return false;
    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return exp.title.toLowerCase().includes(term) || exp.category.toLowerCase().includes(term);
    }
    return true;
  });

  const totalFilteredValue = filteredExpenses.reduce((sum, item) => sum + item.value, 0);
  const regularExpenses = expenses.filter(exp => exp.month === selectedMonth && !exp.isInstallment && !getInstallmentInfo(exp).hasInfo);
  const installmentExpenses = expenses.filter(exp => exp.month === selectedMonth && (exp.isInstallment || getInstallmentInfo(exp).hasInfo));

  // FILTER LOGIC FOR REVENUES
  const filteredRevenues = revenues.filter(rev => {
    if (rev.month !== selectedMonth) return false;
    if (filterRevenueCategory !== 'all' && rev.category !== filterRevenueCategory) return false;

    if (revenueSearchTerm.trim() !== '') {
      const term = revenueSearchTerm.toLowerCase();
      return rev.title.toLowerCase().includes(term) || rev.category.toLowerCase().includes(term);
    }
    return true;
  });

  const totalFilteredRevenues = filteredRevenues.reduce((sum, item) => sum + item.value, 0);

  // SUBMIT HANDLERS
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const expenseValue = parseFloat(value);
    if (isNaN(expenseValue) || expenseValue <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }

    if (!title.trim()) {
      alert('Por favor, insira uma descrição.');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory) {
      alert('Por favor, defina a categoria.');
      return;
    }

    const expenseMonth = date.substring(0, 7);

    // Se for parcelado e o tipo for "total", divide o valor pelo número de parcelas
    const finalValue = isInstallment && installmentValueType === 'total'
      ? parseFloat((expenseValue / parseInt(totalInstallments, 10)).toFixed(2))
      : expenseValue;

    onAddExpense({
      title: title.trim(),
      value: finalValue,
      category: finalCategory,
      month: expenseMonth,
      isInstallment,
      totalInstallments: isInstallment ? parseInt(totalInstallments) : undefined,
      currentInstallment: isInstallment ? parseInt(currentInstallment) : undefined,
      firstInstallmentInNextMonth: isInstallment ? firstInstallmentNextMonth : undefined,
      date,
    });

    setTitle('');
    setValue('');
    setIsInstallment(false);
    setCustomCategory('');
    setIsCustomCategory(false);
    setFirstInstallmentNextMonth(false);
    setInstallmentValueType('single');
  };

  const handleRevenueSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const revenueValue = parseFloat(revValue);
    if (isNaN(revenueValue) || revenueValue <= 0) {
      alert('Por favor, insira um valor de rendimento válido maior que zero.');
      return;
    }

    if (!revTitle.trim()) {
      alert('Por favor, insira uma descrição para o rendimento.');
      return;
    }

    const finalRevCategory = isCustomRevCategory ? customRevCategory.trim() : revCategory;
    if (!finalRevCategory) {
      alert('Por favor, defina a categoria do rendimento.');
      return;
    }

    const revenueMonth = revDate.substring(0, 7);

    onAddRevenue({
      title: revTitle.trim(),
      value: revenueValue,
      category: finalRevCategory,
      month: revenueMonth,
      date: revDate,
    });

    setRevTitle('');
    setRevValue('');
    setCustomRevCategory('');
    setIsCustomRevCategory(false);
  };

  return (
    <div className="flex flex-col gap-4" id="tracker-component-root">
      
      {/* SELETOR DE ABAS PRINCIPAL (SUPER VISÍVEL COBRINDO AS DUAS MODALIDADES) */}
      <div className="flex border-b border-white/5 pb-1 gap-5" id="tracker-tabs">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 outline-none border-b-2 transition-all cursor-pointer ${
            activeTab === 'expenses' 
              ? 'border-indigo-500 text-white font-extrabold' 
              : 'border-transparent text-slate-550 hover:text-slate-300'
          }`}
        >
          <TrendingDown className={`w-3.5 h-3.5 ${activeTab === 'expenses' ? 'text-rose-450' : 'text-slate-500'}`} />
          Saídas / Despesas
        </button>
        <button
          onClick={() => setActiveTab('revenues')}
          className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 outline-none border-b-2 transition-all cursor-pointer ${
            activeTab === 'revenues' 
              ? 'border-emerald-500 text-white font-extrabold' 
              : 'border-transparent text-slate-550 hover:text-emerald-450'
          }`}
        >
          <ArrowUpRight className={`w-3.5 h-3.5 ${activeTab === 'revenues' ? 'text-emerald-400' : 'text-slate-500'}`} />
          Entradas / Rendimentos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="expense-tracker-section">
        
        {/* ======================= ABA DE DESPESAS ======================= */}
        {activeTab === 'expenses' && (
          <>
            {/* COLUNA 1: ADICIONAR NOVA DESPESA (4 Cols no Desktop) */}
            <div className="lg:col-span-4" id="add-expense-container">
              <div className="bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3.5">
                    <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Nova Despesa</h3>
                      <p className="text-[10px] text-slate-400">Registre saídas no mês selecionado</p>
                    </div>
                  </div>

                  <form onSubmit={handleExpenseSubmit} className="space-y-3">
                    {/* Descrição */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                        Descrição / Local
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Supermercado Assaí"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors placeholder:text-zinc-650"
                        maxLength={50}
                        required
                      />
                    </div>

                    {/* Valor e Data em Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                          Valor (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="250.00"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors placeholder:text-zinc-650 privacy-blur"
                          required
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                          Data da Compra
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Selecionar Categoria */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                        Categoria
                      </label>
                      {!isCustomCategory ? (
                        <select
                          value={category}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomCategory(true);
                            } else {
                              setIsCustomCategory(false);
                              setCategory(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 outline-none transition-all cursor-pointer"
                        >
                          {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-zinc-900">
                              {cat}
                            </option>
                          ))}
                          <option value="CUSTOM" className="bg-zinc-900 text-indigo-400">☀️ + Criar Nova Categoria</option>
                        </select>
                      ) : (
                        <div className="flex gap-1.5 animate-fade-in">
                          <input
                            type="text"
                            placeholder="Nome do setor"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 outline-none transition-colors"
                            autoFocus
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setIsCustomCategory(false)}
                            className="px-2 py-1.5 text-[10px] uppercase font-bold border border-white/10 text-slate-350 hover:bg-white/5 rounded-xl transition-colors shrink-0"
                          >
                            Voltar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Compra Parcelada */}
                    <div className="p-2.5 bg-zinc-950/30 rounded-xl border border-white/5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          <div>
                            <span className="text-[10px] font-bold text-slate-350 block leading-tight">Compra Parcelada?</span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isInstallment}
                            onChange={(e) => setIsInstallment(e.target.checked)}
                          />
                          <div className="w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-900 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-700 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                      </div>

                      {isInstallment && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 animate-slideDown">
                          <div className="col-span-2">
                            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">
                              Total Parcelas
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={totalInstallments}
                              onChange={(e) => setTotalInstallments(e.target.value)}
                              className="w-full px-2 py-1 text-[10px] border border-white/10 rounded focus:border-indigo-500 outline-none transition-colors bg-zinc-900 text-white font-bold"
                              required
                            />
                          </div>

                          {/* Tipo de Valor (Total ou Parcela) */}
                          <div className="col-span-2 animate-fadeIn">
                            <label className="block text-[8px] font-bold text-slate-450 uppercase mb-1">
                              O valor informado é:
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInstallmentValueType('single')}
                                className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
                                  installmentValueType === 'single'
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                    : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                                }`}
                              >
                                Valor da Parcela
                              </button>
                              <button
                                type="button"
                                onClick={() => setInstallmentValueType('total')}
                                className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
                                  installmentValueType === 'total'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                                }`}
                              >
                                Valor Total
                              </button>
                            </div>
                          </div>

                          {/* Pré-visualização do Lançamento */}
                          {value && parseFloat(value) > 0 && (
                            <div className="col-span-2 bg-zinc-950/40 border border-white/5 rounded-lg p-2.5 text-[9px] text-slate-400 font-mono animate-fadeIn">
                              <span className="text-[7.5px] text-slate-500 block uppercase font-sans font-semibold mb-1">Projeção do Lançamento:</span>
                              {installmentValueType === 'single' ? (
                                <p className="leading-relaxed">
                                  Serão geradas <span className="text-white font-bold">{totalInstallments}</span> parcelas de{' '}
                                  <span className="text-indigo-400 font-extrabold privacy-blur">{formatCurrency(parseFloat(value))}</span> cada uma.{' '}
                                  (Total: <span className="privacy-blur">{formatCurrency(parseFloat(value) * parseInt(totalInstallments || '1'))}</span>)
                                </p>
                              ) : (
                                <p className="leading-relaxed">
                                  Um total de <span className="text-white font-bold privacy-blur">{formatCurrency(parseFloat(value))}</span> será dividido em{' '}
                                  <span className="text-white font-bold">{totalInstallments}</span> parcelas de{' '}
                                  <span className="text-amber-400 font-extrabold privacy-blur">
                                    {formatCurrency(parseFloat(value) / parseInt(totalInstallments || '1', 10))}
                                  </span>{' '}
                                  cada uma.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Pergunta sobre o fechamento do cartão de crédito */}
                          <div className="col-span-2 mt-1 pt-1 border-t border-white/5">
                            <label className="block text-[8px] font-bold text-slate-450 uppercase mb-1">
                              Fatura do cartão já virou (fechou)?
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setFirstInstallmentNextMonth(false)}
                                className={`py-1.5 px-1.5 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
                                  !firstInstallmentNextMonth
                                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                    : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                                }`}
                              >
                                Não (Cairá em: {monthLabels.current})
                              </button>
                              <button
                                type="button"
                                onClick={() => setFirstInstallmentNextMonth(true)}
                                className={`py-1.5 px-1.5 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
                                  firstInstallmentNextMonth
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                                }`}
                              >
                                Sim (Cairá em: {monthLabels.next})
                              </button>
                            </div>
                            <span className="text-[7.5px] text-slate-500 mt-1 block">
                              *Se o cartão já "virou" (passou do melhor dia de compra), a primeira cobrança cai na próxima fatura.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Lançar Despesa
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* COLUNA 2: HISTÓRICO DE DESPESAS (8 Cols no Desktop) */}
            <div className="lg:col-span-8 flex flex-col" id="expenses-logs-container">
              <div className="bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4 bg-zinc-950/20 p-2.5 rounded-xl border border-white/5">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Histórico de Saídas</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                        Comprometido no Mês:{' '}
                        <span className="font-extrabold text-indigo-400 font-mono privacy-blur">
                          {formatCurrency(totalFilteredValue)}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                        <input
                          type="text"
                          placeholder="Pesquisar..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:w-36 pl-7 pr-2.5 py-1 text-[11px] border border-white/10 bg-zinc-900 text-white rounded-lg outline-none focus:border-indigo-500 placeholder:text-zinc-650"
                        />
                        <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>

                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-2 py-1 text-[11px] border border-white/10 bg-zinc-900 text-zinc-300 rounded-lg outline-none font-medium text-center cursor-pointer"
                      >
                        <option value="all">Filtro Setor</option>
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Abas internas para tipo de despesa */}
                  <div className="flex border-b border-white/5 mb-3 pb-0.5 gap-4 text-[10px] uppercase font-bold text-slate-500" id="tabs-header">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`pb-1 px-1.5 outline-none tracking-wider border-b-2 transition-all cursor-pointer ${filterType === 'all' ? 'border-indigo-400 text-white' : 'border-transparent'}`}
                    >
                      Todos ({filteredExpenses.length})
                    </button>
                    <button
                      onClick={() => setFilterType('one-time')}
                      className={`pb-1 px-1.5 outline-none tracking-wider border-b-2 transition-all cursor-pointer ${filterType === 'one-time' ? 'border-indigo-400 text-white' : 'border-transparent'}`}
                    >
                      À Vista ({regularExpenses.length})
                    </button>
                    <button
                      onClick={() => setFilterType('installment')}
                      className={`pb-1 px-1.5 outline-none tracking-wider border-b-2 transition-all cursor-pointer ${filterType === 'installment' ? 'border-indigo-400 text-white' : 'border-transparent'}`}
                    >
                      Parcelados ({installmentExpenses.length})
                    </button>
                  </div>

                  {/* Projeção Financeira de Compras Parceladas */}
                  {filterType === 'installment' && installmentExpenses.length > 0 && (
                    <div className="bg-[#121212] border border-indigo-500/15 rounded-xl p-3 mb-3 text-white flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center animate-slideDown">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            Projeção de Compras Parceladas
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Cálculo do saldo devedor para meses futuros
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto font-mono text-right text-[11px]">
                        <div className="bg-zinc-950/45 px-2.5 py-1 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-550 block uppercase font-sans font-semibold mb-0.5">Dívida Futura</span>
                          <span className="font-extrabold text-indigo-400 text-xs privacy-blur">
                            {formatCurrency(
                              installmentExpenses.reduce((sum, exp) => {
                                const info = getInstallmentInfo(exp);
                                return sum + (exp.value * info.remaining);
                              }, 0)
                            )}
                          </span>
                        </div>
                        <div className="bg-zinc-950/45 px-2.5 py-1 rounded-lg border border-white/5">
                          <span className="text-[8px] text-slate-550 block uppercase font-sans font-semibold mb-0.5">Parc. Pendentes</span>
                          <span className="font-extrabold text-white text-xs">
                            {installmentExpenses.reduce((sum, exp) => sum + getInstallmentInfo(exp).remaining, 0)} parcelas
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista com Scroller Compacto (max 280px para diminuir o tamanho na tela!) */}
                  <div className="overflow-y-auto max-h-[280px] pr-1 space-y-2 scrollbar-thin" id="expenses-scroller">
                    {filteredExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                        <HelpCircle className="w-8 h-8 text-zinc-850 stroke-1 mb-2" />
                        <p className="font-semibold text-slate-400 text-xs">Nenhum gasto neste filtro</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs">
                          Adicione despesas na coluna ao lado.
                        </p>
                      </div>
                    ) : (
                      filteredExpenses.map((exp) => {
                        const categoryColor = CATEGORY_COLORS[exp.category] || '#6b7280';
                        const instInfo = getInstallmentInfo(exp);
                        return (
                          <div
                            key={exp.id}
                            className="flex items-center justify-between p-2.5 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-xl border border-white/5 transition-all"
                            id={`expense-card-${exp.id}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span 
                                className="w-1.5 h-8 rounded-full shrink-0" 
                                style={{ backgroundColor: categoryColor }}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs truncate leading-tight">
                                    {exp.title}
                                  </span>
                                  {instInfo.hasInfo && (
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-bold font-mono border border-indigo-500/10 shrink-0">
                                      {instInfo.current}/{instInfo.total} parcelas
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-0.5 flex-wrap">
                                  <span className="font-semibold text-slate-400 uppercase tracking-wide text-[8px] bg-zinc-900 border border-white/5 px-1 rounded shrink-0">
                                    {exp.category}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5 shrink-0">
                                    <Calendar className="w-3 h-3 text-slate-600" />
                                    {formatDate(exp.date)}
                                  </span>
                                  {instInfo.hasInfo && instInfo.remaining > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-400 font-bold font-mono text-[8.5px] bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 shrink-0">
                                        Restam {instInfo.remaining}x (Total restante: <span className="privacy-blur">{formatCurrency(exp.value * instInfo.remaining)}</span>)
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <div className="text-right mr-1.5 animate-fadeIn">
                                <span className="font-extrabold text-white text-xs block font-mono privacy-blur">
                                  {formatCurrency(exp.value)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleStartEditExpense(exp)}
                                className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-500/10"
                                title="Editar Gasto"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ 
                                  id: exp.id, 
                                  type: 'expense', 
                                  title: exp.title, 
                                  isInstallment: exp.isInstallment || instInfo.hasInfo 
                                })}
                                className="p-1.5 text-slate-500 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/10"
                                title="Remover Gasto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ======================= ABA DE RENDIMENTOS (RECEITAS) - NOVIDADE SOLICITADA ======================= */}
        {activeTab === 'revenues' && (
          <>
            {/* COLUNA 1: ADICIONAR NOVO RENDIMENTO (4 Cols no Desktop) */}
            <div className="lg:col-span-4" id="add-revenue-container">
              <div className="bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3.5">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-450 border border-emerald-500/10">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Novo Rendimento</h3>
                      <p className="text-[10px] text-emerald-400">Registre Pagamento, FreeLancer, VA, etc.</p>
                    </div>
                  </div>

                  <form onSubmit={handleRevenueSubmit} className="space-y-3">
                    {/* Descrição */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                        Descrição do Rendimento
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Pagamento Mensal ou FreeLancer"
                        value={revTitle}
                        onChange={(e) => setRevTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors placeholder:text-zinc-650"
                        maxLength={55}
                        required
                      />
                    </div>

                    {/* Valor e Data em Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                          Valor Recebido (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 1500.00"
                          value={revValue}
                          onChange={(e) => setRevValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors placeholder:text-zinc-650 privacy-blur"
                          required
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                          Data do Recebimento
                        </label>
                        <input
                          type="date"
                          value={revDate}
                          onChange={(e) => setRevDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Selecionar Categoria */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                        Origem / Tipo de Renda
                      </label>
                      {!isCustomRevCategory ? (
                        <select
                          value={revCategory}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setIsCustomRevCategory(true);
                            } else {
                              setIsCustomRevCategory(false);
                              setRevCategory(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 outline-none transition-all cursor-pointer"
                        >
                          {DEFAULT_REVENUE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-zinc-900">
                              {cat}
                            </option>
                          ))}
                          <option value="CUSTOM" className="bg-zinc-900 text-emerald-400">☀️ + Criar Outra Categ. Origem</option>
                        </select>
                      ) : (
                        <div className="flex gap-1.5 animate-fade-in">
                          <input
                            type="text"
                            placeholder="Ex: Restituição IR"
                            value={customRevCategory}
                            onChange={(e) => setCustomRevCategory(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 outline-none transition-colors"
                            autoFocus
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setIsCustomRevCategory(false)}
                            className="px-2 py-1.5 text-[10px] uppercase font-bold border border-white/10 text-slate-350 hover:bg-white/5 rounded-xl transition-colors shrink-0"
                          >
                            Voltar
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-3 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Lançar Rendimento
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* COLUNA 2: HISTÓRICO DE RENDIMENTOS (8 Cols no Desktop) */}
            <div className="lg:col-span-8 flex flex-col" id="revenues-logs-container">
              <div className="bg-[#161616] rounded-2xl border border-white/5 p-4.5 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4 bg-[#14231b] p-3 p-2.5 rounded-xl border border-emerald-500/15">
                    <div>
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Histórico de Entradas</h3>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-none">
                        Total Recebido no Mês:{' '}
                        <span className="font-extrabold text-emerald-400 font-mono privacy-blur">
                          {formatCurrency(totalFilteredRevenues)}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                        <input
                          type="text"
                          placeholder="Buscar renda..."
                          value={revenueSearchTerm}
                          onChange={(e) => setRevenueSearchTerm(e.target.value)}
                          className="w-full sm:w-36 pl-7 pr-2.5 py-1 text-[11px] border border-white/10 bg-zinc-900 text-white rounded-lg outline-none focus:border-emerald-500 placeholder:text-zinc-650"
                        />
                        <Search className="w-3 h-3 text-slate-550 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>

                      <select
                        value={filterRevenueCategory}
                        onChange={(e) => setFilterRevenueCategory(e.target.value)}
                        className="px-2 py-1 text-[11px] border border-white/10 bg-zinc-900 text-zinc-350 rounded-lg outline-none font-medium text-center cursor-pointer"
                      >
                        <option value="all">Filtro Origem</option>
                        {uniqueRevenueCategories.map(cat => (
                          <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Lista com Scroller Compacto (max 280px para diminuir o tamanho na tela!) */}
                  <div className="overflow-y-auto max-h-[280px] pr-1 space-y-2 scrollbar-thin animate-fade-in" id="revenues-scroller">
                    {filteredRevenues.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                        <PiggyBank className="w-8 h-8 text-zinc-850 stroke-1 mb-2" />
                        <p className="font-semibold text-slate-405 text-xs">Nenhum rendimento cadastrado</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs">
                          Insira seus recebimentos na coluna ao lado para computar suas reais rendas este mês!
                        </p>
                      </div>
                    ) : (
                      filteredRevenues.map((rev) => {
                        const categoryColor = REVENUE_CATEGORY_COLORS[rev.category] || '#10b981';
                        return (
                          <div
                            key={rev.id}
                            className="flex items-center justify-between p-2.5 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-xl border border-white/5 transition-all"
                            id={`revenue-card-${rev.id}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span 
                                className="w-1.5 h-8 rounded-full shrink-0" 
                                style={{ backgroundColor: categoryColor }}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs truncate leading-tight">
                                    {rev.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-0.5">
                                  <span className="font-semibold text-emerald-400 uppercase tracking-wide text-[8px] bg-zinc-900 border border-white/5 px-1 rounded">
                                    {rev.category}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <Calendar className="w-3 h-3 text-slate-600" />
                                    {formatDate(rev.date)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="font-extrabold text-emerald-400 text-xs block font-mono privacy-blur">
                                  +{formatCurrency(rev.value)}
                                </span>
                              </div>
                              <button
                                onClick={() => setItemToDelete({ 
                                  id: rev.id, 
                                  type: 'revenue', 
                                  title: rev.title 
                                })}
                                className="p-1.5 text-slate-600 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/10"
                                title="Remover Rendimento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* MODAL DE EDIÇÃO DE DESPESA */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 max-w-sm w-full rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Editar Saída / Despesa</h3>
                <p className="text-[10px] text-slate-400">Altere as informações abaixo</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-3.5">
              {/* Descrição */}
              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                  Descrição / Local
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                  maxLength={50}
                  required
                />
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                    Data do Vencimento / Compra
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 outline-none transition-colors font-sans"
                    required
                  />
                </div>
              </div>

              {/* Selecionar Categoria */}
              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                  Categoria
                </label>
                {!isEditCustomCategory ? (
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsEditCustomCategory(true);
                      } else {
                        setIsEditCustomCategory(false);
                        setEditCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 outline-none transition-all cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-zinc-900">
                        {cat}
                      </option>
                    ))}
                    <option value="CUSTOM" className="bg-zinc-900 text-indigo-400">☀️ + Criar Nova Categoria</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5 animate-fade-in">
                    <input
                      type="text"
                      placeholder="Nome do setor"
                      value={editCustomCategory}
                      onChange={(e) => setEditCustomCategory(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-indigo-500 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditCustomCategory(false)}
                      className="px-2.5 py-1.5 text-[9px] uppercase font-bold border border-white/10 text-slate-350 hover:bg-white/5 rounded-xl transition-colors shrink-0"
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/5 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-white bg-zinc-900/40 hover:bg-zinc-900 rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 max-w-sm w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-fadeIn" id="delete-confirmation-modal">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Confirmar Exclusão</h4>
                <p className="text-[10px] text-slate-400 font-medium">Esta ação é permanente</p>
              </div>
            </div>
            
            <div className="py-1">
              <p className="text-xs text-slate-300 leading-relaxed">
                Tem certeza de que deseja excluir o lançamento <span className="text-white font-extrabold">"{itemToDelete.title}"</span>?
              </p>
              
              {itemToDelete.type === 'expense' && itemToDelete.isInstallment && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/10 p-3 rounded-xl mt-3 flex gap-2 animate-fadeIn">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="block text-[11px] font-black uppercase tracking-wider mb-0.5">Aviso de Compra Parcelada!</strong>
                    Como este lançamento foi parcelado, <span className="underline font-bold">todas as outras parcelas</span> vinculadas a esta mesma compra serão removidas automaticamente de todos os meses.
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-white bg-zinc-900/40 hover:bg-zinc-900 rounded-xl border border-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (itemToDelete.type === 'expense') {
                    onDeleteExpense(itemToDelete.id);
                  } else {
                    onDeleteRevenue(itemToDelete.id);
                  }
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all cursor-pointer shadow-md shadow-rose-600/10"
              >
                Confirmar e Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
