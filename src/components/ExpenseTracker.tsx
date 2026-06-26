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
  AlertTriangle,
  Zap,
  FileText,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  X
} from 'lucide-react';
import { Expense, Revenue, MonthlyBudget, CreditCard as CreditCardType } from '../types';
import { formatCurrency, formatDate, getInstallmentInfo, getCompetenceMonth } from '../utils/format';
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
  onUpdateExpense: (
    id: string, 
    updatedData: Partial<Omit<Expense, 'id' | 'createdAt'>>,
    scope?: 'single' | 'all' | 'rebuild',
    rebuildParams?: {
      totalInstallments: number;
      firstInstallmentInNextMonth: boolean;
      installmentValueType: 'total' | 'single';
      rawValue: number;
    }
  ) => void;
  revenues: Revenue[];
  onAddRevenue: (revenueData: Omit<Revenue, 'id' | 'createdAt'>) => void;
  onDeleteRevenue: (id: string) => void;
  onUpdateRevenue: (id: string, updatedData: Partial<Omit<Revenue, 'id' | 'createdAt'>>) => void;
  selectedMonth: string;
  monthlyBudgets?: MonthlyBudget[];
  defaultCardClosingDay?: number;
  creditCards?: CreditCardType[];
  onAddCreditCard?: (cardName: string, lastDigits: string) => Promise<void>;
  onDeleteCreditCard?: (cardId: string) => Promise<void>;
  onPayCardBill?: (cardLastDigits: string, month: string) => Promise<void>;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  onUpdateExpense,
  revenues,
  onAddRevenue,
  onDeleteRevenue,
  onUpdateRevenue,
  selectedMonth,
  monthlyBudgets = [],
  defaultCardClosingDay = 5,
  creditCards = [],
  onAddCreditCard,
  onDeleteCreditCard,
  onPayCardBill,
}) => {
  // Navigation Tabs at top: expenses (Saídas) or revenues (Entradas)
  const [activeTab, setActiveTab] = useState<'expenses' | 'revenues'>('expenses');

  // State to handle delete confirmation modal
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'expense' | 'revenue'; title: string; isInstallment?: boolean } | null>(null);

  // FILTERS (Expenses)
  const [filterType, setFilterType] = useState<'all' | 'one-time' | 'installment'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | 'card'>('pix');
  const [cardLastDigits, setCardLastDigits] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [showInlineAddCard, setShowInlineAddCard] = useState(false);
  const [inlineCardName, setInlineCardName] = useState('');
  const [inlineCardDigits, setInlineCardDigits] = useState('');

  // State for credit card bill payment confirmation modal
  const [billToPay, setBillToPay] = useState<{ digits: string; count: number; name?: string; unpaidValue: number } | null>(null);

  // Calculate dynamic months based on the selected date for the card "virou" questions
  const getMonthsLabels = () => {
    try {
      if (!date) return { current: 'Este mês', next: 'Próximo mês' };
      
      const currentComp = getCompetenceMonth(date, monthlyBudgets, defaultCardClosingDay);
      const [cyStr, cmStr] = currentComp.split('-');
      const cy = parseInt(cyStr, 10);
      const cm = parseInt(cmStr, 10);
      
      const ptMonths = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      const currentName = ptMonths[cm - 1] || 'Este mês';
      const curLabel = `${currentName}/${cyStr}`;
      
      const nextMonthDate = new Date(cy, cm, 1);
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
  const [editScope, setEditScope] = useState<'single' | 'all' | 'rebuild'>('single');
  const [editTotalInstallments, setEditTotalInstallments] = useState('12');
  const [editFirstInstallmentInNextMonth, setEditFirstInstallmentInNextMonth] = useState(false);
  const [editInstallmentValueType, setEditInstallmentValueType] = useState<'total' | 'single'>('single');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'pix' | 'boleto' | 'card'>('pix');
  const [editCardLastDigits, setEditCardLastDigits] = useState('');
  const [editSelectedCardId, setEditSelectedCardId] = useState<string>('');

  const handleStartEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    const instInfo = getInstallmentInfo(exp);
    const isInst = exp.isInstallment || instInfo.hasInfo;
    
    // clean title for editing
    const cleanTitle = isInst ? exp.title.replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim() : exp.title;
    setEditTitle(cleanTitle);
    setEditValue(exp.value.toString());
    setEditDate(exp.date);
    setEditPaymentMethod(exp.paymentMethod || 'pix');
    setEditCardLastDigits(exp.cardLastDigits || '');
    const initialCardId = exp.cardId || (exp.paymentMethod === 'card' && exp.cardLastDigits ? (creditCards.find(c => c.lastDigits === exp.cardLastDigits)?.id || '') : '');
    setEditSelectedCardId(initialCardId);
    if (DEFAULT_CATEGORIES.includes(exp.category)) {
      setEditCategory(exp.category);
      setIsEditCustomCategory(false);
    } else {
      setEditCategory('CUSTOM');
      setEditCustomCategory(exp.category);
      setIsEditCustomCategory(true);
    }
    
    if (isInst) {
      setEditScope('all');
      setEditTotalInstallments((instInfo.total || exp.totalInstallments || 12).toString());
      setEditFirstInstallmentInNextMonth(exp.firstInstallmentInNextMonth || false);
      setEditInstallmentValueType('single');
    } else {
      setEditScope('single');
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

    const instInfo = getInstallmentInfo(editingExpense);
    const isCurrentlyInstallment = editingExpense.isInstallment || instInfo.hasInfo;

    const resolvedEditCard = editPaymentMethod === 'card'
      ? (editSelectedCardId && editSelectedCardId !== 'custom'
        ? creditCards.find(c => c.id === editSelectedCardId)
        : creditCards.find(c => c.lastDigits === editCardLastDigits))
      : undefined;

    if (isCurrentlyInstallment && editScope === 'rebuild') {
      const totalInsts = parseInt(editTotalInstallments, 10);
      if (isNaN(totalInsts) || totalInsts < 1) {
        alert('Por favor, insira uma quantidade de parcelas válida.');
        return;
      }
      onUpdateExpense(editingExpense.id, {
        title: editTitle.trim(),
        category: finalCategory,
        date: editDate,
        paymentMethod: editPaymentMethod,
        cardLastDigits: editPaymentMethod === 'card' ? editCardLastDigits : undefined,
        cardId: resolvedEditCard?.id,
        cardNickname: resolvedEditCard?.name,
      }, 'rebuild', {
        totalInstallments: totalInsts,
        firstInstallmentInNextMonth: editFirstInstallmentInNextMonth,
        installmentValueType: editInstallmentValueType,
        rawValue: parsedValue,
      });
    } else if (isCurrentlyInstallment && editScope === 'all') {
      onUpdateExpense(editingExpense.id, {
        title: editTitle.trim(),
        value: parsedValue,
        category: finalCategory,
        date: editDate,
        paymentMethod: editPaymentMethod,
        cardLastDigits: editPaymentMethod === 'card' ? editCardLastDigits : undefined,
        cardId: resolvedEditCard?.id,
        cardNickname: resolvedEditCard?.name,
      }, 'all');
    } else {
      onUpdateExpense(editingExpense.id, {
        title: editTitle.trim(),
        value: parsedValue,
        category: finalCategory,
        date: editDate,
        paymentMethod: editPaymentMethod,
        cardLastDigits: editPaymentMethod === 'card' ? editCardLastDigits : undefined,
        cardId: resolvedEditCard?.id,
        cardNickname: resolvedEditCard?.name,
      }, 'single');
    }

    setEditingExpense(null);
  };

  // EDIT STATE (Revenues)
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [editRevTitle, setEditRevTitle] = useState('');
  const [editRevValue, setEditRevValue] = useState('');
  const [editRevCategory, setEditRevCategory] = useState('');
  const [editCustomRevCategory, setEditCustomRevCategory] = useState('');
  const [isEditCustomRevCategory, setIsEditCustomRevCategory] = useState(false);
  const [editRevDate, setEditRevDate] = useState('');

  const handleStartEditRevenue = (rev: Revenue) => {
    setEditingRevenue(rev);
    setEditRevTitle(rev.title);
    setEditRevValue(rev.value.toString());
    setEditRevDate(rev.date);
    if (DEFAULT_REVENUE_CATEGORIES.includes(rev.category)) {
      setEditRevCategory(rev.category);
      setIsEditCustomRevCategory(false);
    } else {
      setEditRevCategory('CUSTOM');
      setEditCustomRevCategory(rev.category);
      setIsEditCustomRevCategory(true);
    }
  };

  const handleSaveEditRevenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRevenue) return;

    const parsedValue = parseFloat(editRevValue);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      alert('Por favor, informe um valor de rendimento maior que zero.');
      return;
    }

    if (!editRevTitle.trim()) {
      alert('Por favor, informe uma descrição de rendimento.');
      return;
    }

    const finalCategory = isEditCustomRevCategory ? editCustomRevCategory.trim() : editRevCategory;
    if (!finalCategory) {
      alert('Por favor, informe a origem / categoria de rendimento.');
      return;
    }

    onUpdateRevenue(editingRevenue.id, {
      title: editRevTitle.trim(),
      value: parsedValue,
      category: finalCategory,
      date: editRevDate,
    });

    setEditingRevenue(null);
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
  const activeFiltersCount = (filterCategory !== 'all' ? 1 : 0) + (filterPaymentMethod !== 'all' ? 1 : 0) + (filterPaymentStatus !== 'all' ? 1 : 0);

  // FILTER LOGIC FOR EXPENSES
  const baseFilteredExpenses = expenses.filter(exp => {
    if (exp.month !== selectedMonth) return false;
    
    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;

    if (filterPaymentMethod !== 'all') {
      if (filterPaymentMethod === 'pix') {
        if (exp.paymentMethod !== 'pix') return false;
      } else if (filterPaymentMethod === 'boleto') {
        if (exp.paymentMethod !== 'boleto') return false;
      } else if (filterPaymentMethod === 'card') {
        if (exp.paymentMethod !== 'card' && !exp.cardLastDigits) return false;
      } else if (filterPaymentMethod.startsWith('card-')) {
        const lastDigits = filterPaymentMethod.replace('card-', '');
        if (exp.cardLastDigits !== lastDigits) return false;
      }
    }

    if (filterPaymentStatus !== 'all') {
      if (filterPaymentStatus === 'paid' && !exp.paid) return false;
      if (filterPaymentStatus === 'unpaid' && exp.paid) return false;
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return exp.title.toLowerCase().includes(term) || exp.category.toLowerCase().includes(term);
    }
    return true;
  });

  const filteredExpenses = baseFilteredExpenses.filter(exp => {
    const info = getInstallmentInfo(exp);
    const isInst = exp.isInstallment || info.hasInfo;
    
    if (filterType === 'one-time' && isInst) return false;
    if (filterType === 'installment' && !isInst) return false;
    return true;
  });

  const regularExpenses = baseFilteredExpenses.filter(exp => {
    const info = getInstallmentInfo(exp);
    return !exp.isInstallment && !info.hasInfo;
  });

  const installmentExpenses = baseFilteredExpenses.filter(exp => {
    const info = getInstallmentInfo(exp);
    return exp.isInstallment || info.hasInfo;
  });

  const totalFilteredValue = filteredExpenses.reduce((sum, item) => sum + item.value, 0);
  const totalFilteredPreviousInstallments = filteredExpenses.reduce((sum, item) => {
    const info = getInstallmentInfo(item);
    if ((item.isInstallment || info.hasInfo) && info.current > 1) {
      return sum + item.value;
    }
    return sum;
  }, 0);
  const paidExpenses = filteredExpenses.filter(e => e.paid);
  const totalPaidCount = paidExpenses.length;
  const totalExpensesCount = filteredExpenses.length;
  const totalPaidSum = paidExpenses.reduce((sum, item) => sum + item.value, 0);
  const paidPercentage = totalExpensesCount > 0 ? (totalPaidCount / totalExpensesCount) * 100 : 0;

  // Cartões únicos salvos no sistema para autocompletar
  const uniqueCardsUsed = React.useMemo(() => {
    const cards = expenses
      .filter(e => e.paymentMethod === 'card' && e.cardLastDigits)
      .map(e => e.cardLastDigits!);
    return Array.from(new Set(cards)).slice(0, 5); // top 5 unique cards
  }, [expenses]);

  // Detalhamento de cartões do mês corrente
  const creditCardsThisMonth = React.useMemo(() => {
    const cardExpenses = filteredExpenses.filter(e => e.paymentMethod === 'card' && e.cardLastDigits);
    const cardsMap: { [digits: string]: { totalValue: number; count: number; unpaidCount: number; unpaidValue: number } } = {};
    
    cardExpenses.forEach(e => {
      const digits = e.cardLastDigits!;
      if (!cardsMap[digits]) {
        cardsMap[digits] = { totalValue: 0, count: 0, unpaidCount: 0, unpaidValue: 0 };
      }
      cardsMap[digits].count += 1;
      cardsMap[digits].totalValue += e.value;
      if (!e.paid) {
        cardsMap[digits].unpaidCount += 1;
        cardsMap[digits].unpaidValue += e.value;
      }
    });

    return Object.entries(cardsMap).map(([digits, info]) => {
      const matchedCard = creditCards.find(c => c.lastDigits === digits);
      return {
        digits,
        name: matchedCard?.name,
        ...info
      };
    });
  }, [filteredExpenses, creditCards]);

  // Função para abrir o modal de confirmação de quitação da fatura
  const handlePayWholeCard = (digits: string, count: number, name?: string, unpaidValue: number = 0) => {
    setBillToPay({ digits, count, name, unpaidValue });
  };

  // Função para efetivar o pagamento de todas as despesas daquele cartão
  const handleConfirmPayBill = async () => {
    if (!billToPay) return;
    try {
      if (onPayCardBill) {
        await onPayCardBill(billToPay.digits, selectedMonth);
      } else {
        // Fallback local se a prop por algum motivo não for fornecida
        const unpaidCardExpenses = filteredExpenses.filter(
          e => e.paymentMethod === 'card' && e.cardLastDigits === billToPay.digits && !e.paid
        );
        unpaidCardExpenses.forEach(exp => {
          onUpdateExpense(exp.id, { paid: true }, 'single');
        });
      }
    } catch (err) {
      console.error('Erro ao quitar fatura:', err);
    } finally {
      setBillToPay(null);
    }
  };



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

    const resolvedCard = paymentMethod === 'card'
      ? (selectedCardId && selectedCardId !== 'custom'
        ? creditCards.find(c => c.id === selectedCardId)
        : creditCards.find(c => c.lastDigits === cardLastDigits))
      : undefined;

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
      paymentMethod,
      cardLastDigits: paymentMethod === 'card' ? cardLastDigits : undefined,
      cardId: resolvedCard?.id,
      cardNickname: resolvedCard?.name,
    });

    setTitle('');
    setValue('');
    setIsInstallment(false);
    setCustomCategory('');
    setIsCustomCategory(false);
    setFirstInstallmentNextMonth(false);
    setInstallmentValueType('single');
    setPaymentMethod('pix');
    setCardLastDigits('');
    setSelectedCardId('');
    setShowInlineAddCard(false);
    setInlineCardName('');
    setInlineCardDigits('');
  };

  const handleAddInlineCard = async () => {
    if (!inlineCardName.trim() || !inlineCardDigits.trim()) {
      alert('Preencha o apelido e os 4 últimos dígitos do cartão.');
      return;
    }
    if (inlineCardDigits.trim().length !== 4 || isNaN(Number(inlineCardDigits))) {
      alert('Os últimos dígitos devem ter exatamente 4 números.');
      return;
    }
    if (onAddCreditCard) {
      await onAddCreditCard(inlineCardName, inlineCardDigits);
      
      // Clear inputs
      setInlineCardName('');
      setInlineCardDigits('');
      setShowInlineAddCard(false);
      
      // Set digits so it's auto filled
      setCardLastDigits(inlineCardDigits.trim());
    }
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
    <div className="flex flex-col gap-0" id="tracker-component-root">
      
      {/* SELETOR DE ABAS - ABALIZADO COM CANETA MARCA-TEXTO / MARCA-PÁGINA DO CADERNO */}
      <div className="flex items-center gap-2 select-none border-b border-slate-200/10 dark:border-white/5 pb-2 ml-1" id="tracker-tabs">
        <button
          onClick={() => setActiveTab('expenses')}
          type="button"
          className={`group/tab relative py-1.5 px-3 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2 text-[11px] sm:text-xs font-bold ${
            activeTab === 'expenses'
              ? 'text-rose-500 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-400/5 border border-rose-500/10'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200 bg-transparent'
          }`}
          title="Ver Despesas"
        >
          <TrendingDown className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${activeTab === 'expenses' ? 'text-rose-500 dark:text-rose-455' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="tracking-wide">Saídas / Despesas</span>
        </button>

        <button
          onClick={() => setActiveTab('revenues')}
          type="button"
          className={`group/tab relative py-1.5 px-3 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2 text-[11px] sm:text-xs font-bold ${
            activeTab === 'revenues'
              ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/10'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-slate-200 bg-transparent'
          }`}
          title="Ver Entradas"
        >
          <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${activeTab === 'revenues' ? 'text-emerald-500 dark:text-emerald-450' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="tracking-wide">Entradas / Rendimentos</span>
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

                    {/* Forma de Pagamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">
                        Forma de Pagamento
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pix')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            paymentMethod === 'pix'
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 shadow-sm shadow-teal-500/5'
                              : 'bg-zinc-900 text-slate-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>PIX</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('boleto')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            paymentMethod === 'boleto'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              : 'bg-zinc-900 text-slate-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Boleto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            paymentMethod === 'card'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-500/5'
                              : 'bg-zinc-900 text-slate-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Cartão</span>
                        </button>
                      </div>

                      {/* Se for Cartão, selecionar dos cadastrados ou digitar dígitos */}
                      {paymentMethod === 'card' && (
                        <div className="mt-2.5 animate-slideDown p-2.5 bg-zinc-950/20 border border-white/5 rounded-xl flex flex-col gap-2.5">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[8.5px] font-bold text-indigo-400 uppercase tracking-wide leading-none">
                                Selecionar Cartão
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowInlineAddCard(prev => !prev)}
                                className="text-[8.5px] text-indigo-400 hover:text-indigo-350 font-bold uppercase tracking-wide cursor-pointer transition-colors"
                              >
                                {showInlineAddCard ? '• Voltar' : '+ Cadastrar Novo'}
                              </button>
                            </div>

                            {/* Inline Add Card Form */}
                            {showInlineAddCard ? (
                              <div className="bg-zinc-900 border border-white/5 rounded-xl p-2.5 space-y-2 mt-1 animate-fadeIn">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Cadastrar cartão inline</span>
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-[8px] text-slate-400 font-semibold uppercase leading-none mb-1">Apelido do Cartão</label>
                                    <input
                                      type="text"
                                      placeholder="Ex: Cartão XP, Nubank"
                                      className="w-full bg-[#18181b] border border-white/5 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-semibold animate-fadeIn"
                                      value={inlineCardName}
                                      onChange={(e) => setInlineCardName(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] text-slate-400 font-semibold uppercase leading-none mb-1">4 últimos dígitos</label>
                                    <input
                                      type="text"
                                      maxLength={4}
                                      placeholder="Ex: 5678"
                                      className="w-full bg-[#18181b] border border-white/5 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono font-semibold"
                                      value={inlineCardDigits}
                                      onChange={(e) => setInlineCardDigits(e.target.value.replace(/\D/g, ''))}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleAddInlineCard}
                                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md cursor-pointer text-center h-7"
                                  >
                                    Salvar e Usar Cartão
                                  </button>
                                </div>
                              </div>
                            ) : creditCards.length > 0 ? (
                              <select
                                className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-lg focus:border-indigo-500 outline-none font-semibold cursor-pointer"
                                value={selectedCardId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedCardId(val);
                                  if (val && val !== 'custom') {
                                    const selected = creditCards.find(c => c.id === val);
                                    if (selected) {
                                      setCardLastDigits(selected.lastDigits);
                                    }
                                  } else if (val === 'custom') {
                                    setCardLastDigits('');
                                  }
                                }}
                              >
                                <option value="">-- Escolha um cartão cadastrado --</option>
                                {creditCards.map(card => (
                                  <option key={card.id} value={card.id}>
                                    {card.name} (**** {card.lastDigits})
                                  </option>
                                ))}
                                <option value="custom">Outro Cartão / Digitar Final...</option>
                              </select>
                            ) : (
                              <div className="text-[9px] text-slate-500 bg-zinc-905/45 p-2 rounded-lg text-center select-none">
                                Nenhum cartão cadastrado ainda. Clique em "+ Cadastrar Novo" para registrar!
                              </div>
                            )}
                          </div>

                          {/* Se for Outro Cartão ou nenhum cartão cadastrado, exibe os 4 últimos dígitos normais */}
                          {(!showInlineAddCard && (creditCards.length === 0 || selectedCardId === 'custom')) && (
                            <div className="animate-slideDown">
                              <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1 pt-1 border-t border-white/5">
                                4 últimos dígitos do cartão
                              </label>
                              <input
                                type="text"
                                maxLength={4}
                                placeholder="Ex: 5678"
                                value={cardLastDigits}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setCardLastDigits(val);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-lg focus:border-indigo-500 outline-none font-mono text-center tracking-widest font-bold placeholder:tracking-normal placeholder:font-sans"
                                required={paymentMethod === 'card' && (creditCards.length === 0 || selectedCardId === 'custom')}
                              />
                            </div>
                          )}

                          {/* Quick selector of already used card numbers from past history */}
                          {!showInlineAddCard && uniqueCardsUsed.length > 0 && (
                            <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/5">
                              <span className="text-[7.5px] text-slate-500 leading-none uppercase tracking-wider font-semibold">Dígitos Recentes:</span>
                              <div className="flex flex-wrap gap-1">
                                {uniqueCardsUsed.map(digits => (
                                  <button
                                    key={digits}
                                    type="button"
                                    onClick={() => {
                                      setCardLastDigits(digits);
                                      // Se houver cartão cadastrado correspondente a esses dígitos, auto-seleciona ele!
                                      const matchedCard = creditCards.find(c => c.lastDigits === digits);
                                      if (matchedCard) {
                                        setSelectedCardId(matchedCard.id);
                                      } else {
                                        setSelectedCardId('custom');
                                      }
                                    }}
                                    className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-zinc-900/60 hover:bg-zinc-800 text-slate-350 hover:text-white rounded border border-white/5 hover:border-white/10 cursor-pointer shadow-xs animate-fadeIn"
                                  >
                                    **** {digits}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
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
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400">
                        <span>
                          Comprometido:{' '}
                          <span className="font-extrabold text-indigo-400 font-mono privacy-blur">
                            {formatCurrency(totalFilteredValue)}
                          </span>
                        </span>
                        <span className="text-slate-600 hidden xs:inline">•</span>
                        <span title="Novas compras à vista ou novas parcelas iniciando neste mês">
                          Novos:{' '}
                          <span className="font-bold text-slate-200 font-mono privacy-blur">
                            {formatCurrency(totalFilteredValue - totalFilteredPreviousInstallments)}
                          </span>
                        </span>
                        <span className="text-slate-600 hidden xs:inline">•</span>
                        <span title="Parcelas herdadas que iniciaram em meses passados" className="text-amber-400/90 font-medium">
                          Herdado:{' '}
                          <span className="font-bold text-amber-400 font-mono privacy-blur">
                            {formatCurrency(totalFilteredPreviousInstallments)}
                          </span>
                        </span>
                      </div>
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

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                          className={`px-3 py-1 text-[11px] font-bold border rounded-lg outline-none flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeFiltersCount > 0
                              ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
                              : 'border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <SlidersHorizontal className="w-3 h-3 text-indigo-400 font-bold" />
                          <span>Filtros</span>
                          {activeFiltersCount > 0 && (
                            <span className="flex items-center justify-center bg-indigo-500 text-white font-extrabold font-mono text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                              {activeFiltersCount}
                            </span>
                          )}
                          <ChevronDown className={`w-3 h-3 transition-transform duration-205 ${showFilterDropdown ? 'rotate-180 text-white' : 'text-slate-500'}`} />
                        </button>

                        {showFilterDropdown && (
                          <>
                            {/* Backdrop to close when clicking outside */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowFilterDropdown(false)} 
                            />
                            
                            {/* Popover Card */}
                            <div className="absolute right-0 mt-2 w-64 bg-[#141414] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3.5 animate-scaleUp">
                              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  Filtrar Lançamentos
                                </span>
                                <button 
                                  type="button" 
                                  onClick={() => setShowFilterDropdown(false)}
                                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Categoria Selector */}
                              <div className="space-y-1.5 text-left">
                                <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                  Filtrar por Setor (Categoria)
                                </label>
                                <select
                                  value={filterCategory}
                                  onChange={(e) => setFilterCategory(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-zinc-300 rounded-lg outline-none font-medium cursor-pointer"
                                >
                                  <option value="all">Todos os setores</option>
                                  {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat} className="bg-zinc-900 text-white">{cat}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Forma de Pagamento Selector */}
                              <div className="space-y-1.5 text-left">
                                <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                  Filtrar por Pagamento
                                </label>
                                <select
                                  value={filterPaymentMethod}
                                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-zinc-300 rounded-lg outline-none font-medium cursor-pointer"
                                >
                                  <option value="all">Todas as formas</option>
                                  <optgroup label="Opções Padrão" className="bg-zinc-950 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                                    <option value="pix" className="bg-zinc-900 text-white">⚡ Pix</option>
                                    <option value="boleto" className="bg-zinc-900 text-white">📄 Boleto</option>
                                    <option value="card" className="bg-zinc-900 text-white">💳 Cartão (Todos)</option>
                                  </optgroup>
                                  {creditCards.length > 0 && (
                                    <optgroup label="Meus Cartões" className="bg-zinc-950 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                                      {creditCards.map(card => (
                                        <option key={card.id} value={`card-${card.lastDigits}`} className="bg-zinc-900 text-white">
                                          💳 {card.name} (•••• {card.lastDigits})
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                              </div>

                              {/* Status de Pagamento Selector */}
                              <div className="space-y-1.5 text-left">
                                <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                  Filtrar por Status
                                </label>
                                <select
                                  value={filterPaymentStatus}
                                  onChange={(e) => setFilterPaymentStatus(e.target.value as 'all' | 'paid' | 'unpaid')}
                                  className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-zinc-300 rounded-lg outline-none font-medium cursor-pointer"
                                >
                                  <option value="all">Todos os status</option>
                                  <option value="paid" className="bg-zinc-900 text-white">🟢 Pagas</option>
                                  <option value="unpaid" className="bg-zinc-900 text-white">🟡 Pendentes (Não pagas)</option>
                                </select>
                              </div>

                              {/* Actions inside filter */}
                              <div className="flex items-center justify-between pt-2 border-t border-t-white/5 text-[9.5px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterCategory('all');
                                    setFilterPaymentMethod('all');
                                    setFilterPaymentStatus('all');
                                  }}
                                  disabled={activeFiltersCount === 0}
                                  className="text-red-400 hover:text-red-300 font-extrabold uppercase disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                >
                                  Limpar Filtros
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowFilterDropdown(false)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-black text-white rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  Aplicar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Abas internas para tipo de despesa */}
                  <div className="flex border-b border-white/5 mb-3 pb-0.5 gap-4 text-[10px] uppercase font-bold text-slate-500" id="tabs-header">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`pb-1 px-1.5 outline-none tracking-wider border-b-2 transition-all cursor-pointer ${filterType === 'all' ? 'border-indigo-400 text-white' : 'border-transparent'}`}
                    >
                      Todos ({baseFilteredExpenses.length})
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

                  {/* Quitar faturas de cartões cadastrados */}
                  {creditCardsThisMonth.length > 0 && (
                    <div className="bg-zinc-950/20 border border-white/5 rounded-xl p-3.5 mb-3.5 animate-fade-in flex flex-col gap-2.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Controle e Quitação de Faturas
                      </span>
                      <div className="flex flex-col gap-2.5">
                        {creditCardsThisMonth.map(card => (
                          <div 
                            key={card.digits} 
                            className="bg-[#18181b] border border-white/5 hover:border-white/10 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                          >
                            {/* Card Name / Details */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 text-left">
                                <span className="text-xs font-bold text-white block truncate leading-tight">
                                  {card.name ? `${card.name}` : 'Cartão de Crédito'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono font-medium block mt-0.5">
                                  Final •••• {card.digits}
                                </span>
                              </div>
                            </div>

                            {/* Card Status / Financials */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-left text-[11px] sm:ml-auto">
                              <div className="min-w-[110px]">
                                <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider mb-0.5">Total Faturado</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-extrabold text-white font-mono privacy-blur">
                                    {formatCurrency(card.totalValue)}
                                  </span>
                                  <span className="text-[9px] text-slate-500 leading-none">({card.count}x)</span>
                                </div>
                              </div>

                              <div className="min-w-[130px]">
                                <span className="text-[8px] text-slate-550 block uppercase font-bold tracking-wider mb-0.5">Status de Quitação</span>
                                {card.unpaidCount > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="font-extrabold text-amber-500 font-mono privacy-blur">
                                      {formatCurrency(card.unpaidValue)}
                                    </span>
                                    <span className="text-[9px] text-amber-500/80 font-medium">
                                      {card.unpaidCount} {card.unpaidCount === 1 ? 'pendente' : 'pendentes'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                    ✓ FATURA PAGA
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="shrink-0 flex items-center justify-end w-full sm:w-auto">
                              {card.unpaidCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handlePayWholeCard(card.digits, card.unpaidCount, card.name, card.unpaidValue)}
                                  className="w-full sm:w-auto px-4 py-2 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md shadow-indigo-600/10 active:scale-[0.98]"
                                >
                                  Pagar Fatura
                                </button>
                              ) : (
                                <span className="hidden sm:inline text-[9px] font-bold text-zinc-650 uppercase tracking-widest mr-2 select-none">
                                  Sem pendências
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

                  {/* Checklist & Progress Tracker de Contas */}
                  {totalExpensesCount > 0 && (
                    <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-3 mb-3 animate-fade-in flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-1.5 w-1.5 relative shrink-0">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${paidPercentage === 100 ? 'bg-emerald-400' : 'bg-indigo-405'}`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${paidPercentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            Checklist de Contas do Mês
                          </span>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-indigo-400">
                          {totalPaidCount} de {totalExpensesCount} pagas ({paidPercentage.toFixed(0)}%)
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${
                            paidPercentage === 100 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                              : 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                          }`}
                          style={{ width: `${paidPercentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-500">
                        <span>Pago: <strong className="text-emerald-400 font-mono privacy-blur">{formatCurrency(totalPaidSum)}</strong></span>
                        <span>Pendente: <strong className="text-rose-400 font-mono privacy-blur">{formatCurrency(totalFilteredValue - totalPaidSum)}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Lista com Scroller Expandido (Garante o mesmo tamanho com pelo menos 5 lançamentos visáveis) */}
                  <div className="overflow-y-auto h-[480px] min-h-[480px] pr-1 space-y-2 scrollbar-thin" id="expenses-scroller">
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
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              exp.paid 
                                ? 'bg-zinc-950/20 border-white/2 opacity-50' 
                                : 'bg-zinc-900/20 hover:bg-zinc-900/40 border-white/5'
                            }`}
                            id={`expense-card-${exp.id}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span 
                                className="w-1.5 h-8 rounded-full shrink-0" 
                                style={{ backgroundColor: categoryColor }}
                              />
                              
                              {/* Checkbox de Lançamento Pago */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateExpense(exp.id, { paid: !exp.paid }, 'single');
                                }}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  exp.paid 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-xs' 
                                    : 'border-white/15 text-transparent hover:border-white/30 bg-zinc-950/40'
                                }`}
                                title={exp.paid ? "Marcar como Pendente" : "Marcar como Pago"}
                              >
                                {exp.paid && (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-bold text-xs truncate leading-tight transition-all ${
                                    exp.paid ? 'text-slate-500 line-through' : 'text-white'
                                  }`}>
                                    {exp.title}
                                  </span>
                                  {instInfo.hasInfo && (
                                    <span 
                                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono border shrink-0 transition-all ${
                                        exp.paid 
                                          ? 'bg-zinc-900/40 text-slate-600 border-white/5' 
                                          : instInfo.current > 1
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/15 shadow-xs shadow-amber-500/5'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15 shadow-xs shadow-indigo-500/5'
                                      }`}
                                      title={instInfo.current > 1 ? "Parcela herdada de meses anteriores (compra não iniciada neste mês)" : "Parcela nova iniciada neste mês"}
                                    >
                                      {instInfo.current > 1 ? `⌛ Parcela ${instInfo.current}/${instInfo.total}` : `✨ Parcela ${instInfo.current}/${instInfo.total}`}
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
                                  {exp.paymentMethod && (
                                    <>
                                      <span>•</span>
                                      <span className={`flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 border transition-colors ${
                                        exp.paymentMethod === 'card'
                                          ? exp.paid
                                            ? 'bg-zinc-950/40 text-slate-600 border-white/5'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'
                                          : exp.paymentMethod === 'pix'
                                          ? exp.paid
                                            ? 'bg-zinc-950/40 text-slate-600 border-white/5'
                                            : 'bg-teal-500/10 text-teal-400 border-teal-500/10'
                                          : exp.paid
                                          ? 'bg-zinc-950/40 text-slate-600 border-white/5'
                                          : 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                                      }`}>
                                        {exp.paymentMethod === 'card' ? (
                                          <>
                                            <CreditCard className="w-2.5 h-2.5" />
                                            <span>
                                              {exp.cardNickname || (exp.cardId ? creditCards.find(c => c.id === exp.cardId)?.name : creditCards.find(c => c.lastDigits === exp.cardLastDigits)?.name) || 'Cartão'}
                                              {exp.cardLastDigits ? ` (**** ${exp.cardLastDigits})` : ''}
                                            </span>
                                          </>
                                        ) : exp.paymentMethod === 'pix' ? (
                                          <>
                                            <Zap className="w-2.5 h-2.5" />
                                            Pix
                                          </>
                                        ) : (
                                          <>
                                            <FileText className="w-2.5 h-2.5" />
                                            Boleto
                                          </>
                                        )}
                                      </span>
                                    </>
                                  )}
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
                                <span className={`font-extrabold text-xs block font-mono privacy-blur transition-all ${
                                  exp.paid ? 'text-slate-500 font-medium line-through' : 'text-white'
                                }`}>
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

                  {/* Lista com Scroller Expandido (Garante o mesmo tamanho com pelo menos 5 lançamentos visíveis) */}
                  <div className="overflow-y-auto h-[480px] min-h-[480px] pr-1 space-y-2 scrollbar-thin animate-fade-in" id="revenues-scroller">
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

                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="text-right mr-1.5">
                                <span className="font-extrabold text-emerald-400 text-xs block font-mono privacy-blur">
                                  +{formatCurrency(rev.value)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleStartEditRevenue(rev)}
                                className="p-1.5 text-slate-505 hover:text-emerald-450 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/10"
                                title="Editar Rendimento"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setItemToDelete({ 
                                  id: rev.id, 
                                  type: 'revenue', 
                                  title: rev.title 
                                })}
                                className="p-1.5 text-slate-505 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/10"
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
          <div className={`bg-[#141414] border border-white/10 w-full rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp transition-all ${
            editingExpense.isInstallment || getInstallmentInfo(editingExpense).hasInfo ? 'max-w-md' : 'max-w-sm'
          }`}>
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Editar Saída / Despesa</h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {editingExpense.isInstallment || getInstallmentInfo(editingExpense).hasInfo 
                    ? 'Lançamento Parcelado Ativo' 
                    : 'Altere as informações abaixo'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditExpense} className="space-y-4">
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
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1 font-sans">
                    {getInstallmentInfo(editingExpense).hasInfo && editScope === 'rebuild' && editInstallmentValueType === 'total' 
                      ? 'Valor Total (R$)' 
                      : 'Valor (R$)'}
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
                    Data do Vencedor / Compra
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

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('pix')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      editPaymentMethod === 'pix'
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                        : 'bg-zinc-900 text-slate-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>PIX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('boleto')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      editPaymentMethod === 'boleto'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-zinc-900 text-slate-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Boleto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentMethod('card')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      editPaymentMethod === 'card'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-500/5'
                        : 'bg-zinc-900 text-slate-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cartão</span>
                  </button>
                </div>

                {/* Se for Cartão, selecionar dos cadastrados ou digitar dígitos */}
                {editPaymentMethod === 'card' && (
                  <div className="mt-2.5 animate-slideDown p-2 bg-zinc-950/20 border border-white/5 rounded-xl flex flex-col gap-2.5">
                    <div>
                      <label className="block text-[8.5px] font-bold text-indigo-400 uppercase tracking-wide leading-none mb-1">
                        Selecionar Cartão
                      </label>
                      {creditCards.length > 0 ? (
                        <select
                          className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-lg focus:border-indigo-500 outline-none font-semibold cursor-pointer animate-fadeIn"
                          value={editSelectedCardId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditSelectedCardId(val);
                            if (val && val !== 'custom') {
                              const selected = creditCards.find(c => c.id === val);
                              if (selected) {
                                setEditCardLastDigits(selected.lastDigits);
                              }
                            } else if (val === 'custom') {
                              setEditCardLastDigits('');
                            }
                          }}
                        >
                          <option value="">-- Escolha um cartão cadastrado --</option>
                          {creditCards.map(card => (
                            <option key={card.id} value={card.id}>
                              {card.name} (**** {card.lastDigits})
                            </option>
                          ))}
                          <option value="custom">Outro Cartão / Digitar Final...</option>
                        </select>
                      ) : (
                        <div className="text-[9px] text-slate-500 bg-zinc-905/45 p-2 rounded-lg text-center select-none">
                          Nenhum cartão cadastrado ainda. Salve cartões nas configurações do cabeçalho ou no formulário principal!
                        </div>
                      )}
                    </div>

                    {/* Se for Outro Cartão ou se não houver cartões cadastrados, exibe o input normal de 4 dígitos */}
                    {(creditCards.length === 0 || editSelectedCardId === 'custom') && (
                      <div className="animate-slideDown">
                        <label className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1 pt-1 border-t border-white/5">
                          4 últimos dígitos do cartão
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Ex: 5678"
                          value={editCardLastDigits}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setEditCardLastDigits(val);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-lg focus:border-indigo-500 outline-none font-mono text-center tracking-widest font-bold placeholder:tracking-normal placeholder:font-sans"
                          required={editPaymentMethod === 'card' && (creditCards.length === 0 || editSelectedCardId === 'custom')}
                        />
                      </div>
                    )}

                    {/* Quick selector of already used card numbers */}
                    {uniqueCardsUsed.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1 pt-1.5 border-t border-white/5">
                        <span className="text-[7.5px] text-slate-500 leading-none uppercase tracking-wider font-semibold">Dígitos Recentes:</span>
                        <div className="flex flex-wrap gap-1">
                          {uniqueCardsUsed.map(digits => (
                            <button
                              key={digits}
                              type="button"
                              onClick={() => {
                                setEditCardLastDigits(digits);
                                const matchedCard = creditCards.find(c => c.lastDigits === digits);
                                if (matchedCard) {
                                  setEditSelectedCardId(matchedCard.id);
                                } else {
                                  setEditSelectedCardId('custom');
                                }
                              }}
                              className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-zinc-900/60 hover:bg-zinc-800 text-slate-350 hover:text-white rounded border border-white/5 hover:border-white/10 cursor-pointer shadow-xs animate-fadeIn"
                            >
                              **** {digits}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Se for uma compra originalmente parcelada, exibe o painel de planos de parcelamento */}
              {(editingExpense.isInstallment || getInstallmentInfo(editingExpense).hasInfo) && (
                <div className="bg-zinc-950/40 p-3 rounded-2xl border border-white/5 space-y-3.5 mt-2 animate-fadeIn">
                  <div>
                    <label className="block text-[9px] font-extrabold text-indigo-400 uppercase mb-1.5 tracking-wider">
                      Modo de Edição da Compra Parcelada
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditScope('single')}
                        className={`py-1 rounded-lg text-[9px] font-black border transition-all text-center cursor-pointer ${
                          editScope === 'single'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-extrabold'
                            : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                        }`}
                      >
                        Apenas esta
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditScope('all')}
                        className={`py-1 rounded-lg text-[9px] font-black border transition-all text-center cursor-pointer ${
                          editScope === 'all'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-extrabold'
                            : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                        }`}
                      >
                        Todas (Básico)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditScope('rebuild')}
                        className={`py-1 rounded-lg text-[9px] font-black border transition-all text-center cursor-pointer ${
                          editScope === 'rebuild'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold'
                            : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                        }`}
                      >
                        Refazer Plano
                      </button>
                    </div>
                    <p className="text-[8.5px] text-slate-500 mt-1 leading-normal">
                      {editScope === 'single' && '• Edita somente o registro deste mês específico. Não afeta as outras parcelas.'}
                      {editScope === 'all' && '• Atualiza nome, categoria e valor em todos os meses em que existirem outras parcelas.'}
                      {editScope === 'rebuild' && '• Substitui e recria toda o plano de parcelamento futuro a partir da data de compra escolhida.'}
                    </p>
                  </div>

                  {editScope === 'rebuild' && (
                    <div className="space-y-3.5 pt-2 border-t border-white/5 animate-slideDown">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase mb-1">
                            Total de Parcelas
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={editTotalInstallments}
                            onChange={(e) => setEditTotalInstallments(e.target.value)}
                            className="w-full px-2 py-1 text-[10px] border border-white/10 rounded focus:border-indigo-500 outline-none transition-colors bg-zinc-900 text-white font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase mb-1">
                            Fatura já Fechou?
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => setEditFirstInstallmentInNextMonth(false)}
                              className={`py-1.5 text-[9px] font-bold border rounded-lg transition-all text-center cursor-pointer ${
                                !editFirstInstallmentInNextMonth
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                  : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                              }`}
                            >
                              Não
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditFirstInstallmentInNextMonth(true)}
                              className={`py-1.5 text-[9px] font-bold border rounded-lg transition-all text-center cursor-pointer ${
                                editFirstInstallmentInNextMonth
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                              }`}
                            >
                              Sim
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold text-slate-440 uppercase mb-1">
                          O valor informado é:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditInstallmentValueType('single')}
                            className={`py-1 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
                              editInstallmentValueType === 'single'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 font-bold'
                                : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                            }`}
                          >
                            Valor da Parcela
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditInstallmentValueType('total')}
                            className={`py-1 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer ${
                              editInstallmentValueType === 'total'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold'
                                : 'bg-zinc-900/40 text-slate-400 border-white/5 hover:border-white/10'
                            }`}
                          >
                            Valor Total
                          </button>
                        </div>
                      </div>

                      {editValue && parseFloat(editValue) > 0 && (
                        <div className="bg-zinc-950 border border-white/5 rounded-lg p-2.5 text-[9px] text-slate-400 font-mono leading-normal">
                          <span className="text-[7.5px] text-slate-500 block uppercase font-sans font-semibold mb-0.5">Nova Projeção do Plano:</span>
                          {editInstallmentValueType === 'single' ? (
                            <p>
                              Serão geradas <span className="text-white font-bold">{editTotalInstallments}</span> parcelas de{' '}
                              <span className="text-indigo-400 font-extrabold">{formatCurrency(parseFloat(editValue))}</span> cada.{' '}
                              (Total: {formatCurrency(parseFloat(editValue) * parseInt(editTotalInstallments || '1'))})
                            </p>
                          ) : (
                            <p>
                              Total de <span className="text-white font-bold">{formatCurrency(parseFloat(editValue))}</span> dividido em{' '}
                              <span className="text-white font-bold">{editTotalInstallments}</span> parcelas de{' '}
                              <span className="text-amber-400 font-extrabold">
                                {formatCurrency(parseFloat(editValue) / parseInt(editTotalInstallments || '1', 10))}
                              </span>{' '}
                              cada uma.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-white/5 justify-end text-xs">
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
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE RENDIMENTO */}
      {editingRevenue && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 max-w-sm w-full rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-450">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Editar Entrada / Rendimento</h3>
                <p className="text-[10px] text-slate-400">Altere as informações do recebimento abaixo</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditRevenue} className="space-y-3.5">
              {/* Descrição */}
              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                  Descrição do Rendimento
                </label>
                <input
                  type="text"
                  value={editRevTitle}
                  onChange={(e) => setEditRevTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  maxLength={55}
                  required
                />
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                    Valor Recebido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editRevValue}
                    onChange={(e) => setEditRevValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                    Data do Recebimento
                  </label>
                  <input
                    type="date"
                    value={editRevDate}
                    onChange={(e) => setEditRevDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 outline-none transition-colors font-sans"
                    required
                  />
                </div>
              </div>

              {/* Selecionar Categoria */}
              <div>
                <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                  Origem / Categoria de Renda
                </label>
                {!isEditCustomRevCategory ? (
                  <select
                    value={editRevCategory}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsEditCustomRevCategory(true);
                      } else {
                        setIsEditCustomRevCategory(false);
                        setEditRevCategory(e.target.value);
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
                      value={editCustomRevCategory}
                      onChange={(e) => setEditCustomRevCategory(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-white/10 bg-zinc-900 text-white rounded-xl focus:border-emerald-500 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditCustomRevCategory(false)}
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
                  onClick={() => setEditingRevenue(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-white bg-zinc-900/40 hover:bg-zinc-900 rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10"
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

      {/* MODAL DE CONFIRMAÇÃO DE QUITAÇÃO DE FATURA */}
      {billToPay && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp transition-all">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quitar Fatura de Cartão</h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Competência: {selectedMonth.split('-').reverse().join('/')}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 py-1">
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Você deseja marcar todas as <strong className="text-white font-black font-mono">{billToPay.count}</strong> despesas pendentes do cartão{' '}
                <span className="text-indigo-400 font-bold">
                  {billToPay.name ? `${billToPay.name} (**** ${billToPay.digits})` : `**** ${billToPay.digits}`}
                </span>{' '}
                neste mês como <strong className="text-emerald-400 uppercase tracking-wide">PAGAS</strong> de uma só vez?
              </p>

              <div className="bg-zinc-950/30 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">Total da Quitação:</span>
                <span className="text-sm font-black font-mono text-emerald-400 privacy-blur">
                  {formatCurrency(billToPay.unpaidValue)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setBillToPay(null)}
                className="px-4 py-2 text-xs font-bold text-[#b4b4b8] hover:text-white bg-[#1c1c1c] hover:bg-[#252525] rounded-xl border border-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayBill}
                className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
