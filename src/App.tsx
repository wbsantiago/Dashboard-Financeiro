/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  DollarSign,
  PiggyBank,
  Check,
  RefreshCw,
  Coins,
  Settings,
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react';

import { AppData, Expense, Revenue, CategoryBudget, MonthlyBudget } from './types';
import { loadAppData, saveAppData, exportDataAsJSON, importDataFromJSON, DEFAULT_CATEGORIES } from './utils/storage';
import { formatCurrency, formatMonthName, getCurrentMonthStr, getInstallmentInfo } from './utils/format';

// import components
import { KpiCards } from './components/KpiCards';
import { CategoryBudgets } from './components/CategoryBudgets';
import { ExpenseTracker } from './components/ExpenseTracker';
import { ChartsView } from './components/ChartsView';
import { AnnualSummary } from './components/AnnualSummary';

export default function App() {
  // Load initial state
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthStr()); // "2026-05"
  
  // UI States
  const [activeView, setActiveView] = useState<'monthly' | 'annual'>('monthly');
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [savingsInput, setSavingsInput] = useState<number>(30);
  const [showNotification, setShowNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('privacy-mode') === 'true';
  });
  const [hideMobileBudgets, setHideMobileBudgets] = useState<boolean>(() => {
    return localStorage.getItem('hide-mobile-budgets') === 'true';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state changes with localStorage
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    localStorage.setItem('privacy-mode', String(privacyMode));
  }, [privacyMode]);

  useEffect(() => {
    localStorage.setItem('hide-mobile-budgets', String(hideMobileBudgets));
  }, [hideMobileBudgets]);

  // Load active month config values into inputs
  useEffect(() => {
    const activeBudget = getCurrentMonthBudget();
    setSalaryInput(activeBudget.salary.toString());
    setSavingsInput(activeBudget.targetSavingsPercentage);
  }, [selectedMonth, data]);

  // Helper toast notifier
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => {
      setShowNotification(null);
    }, 4000);
  };

  // Get active month budget data or bootstrap default
  const getCurrentMonthBudget = (): MonthlyBudget => {
    const budget = data.monthlyBudgets.find(b => b.month === selectedMonth);
    if (budget) return budget;
    
    // Fallback default structure
    return {
      month: selectedMonth,
      salary: data.defaultMonthlySalary,
      targetSavingsPercentage: data.defaultTargetSavingsPercentage
    };
  };

  const activeBudget = getCurrentMonthBudget();

  // Navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 15);
    const prevStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 15);
    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextStr);
  };

  // Add / Delete core items
  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (expenseData.isInstallment && expenseData.totalInstallments && expenseData.currentInstallment) {
      const startInstallment = expenseData.currentInstallment;
      const totalInst = expenseData.totalInstallments;
      const baseMonth = expenseData.month; // e.g., "2026-05"
      const baseDate = expenseData.date; // e.g., "2026-05-15"
      
      const generatedExpenses: Expense[] = [];
      const now = Date.now();
      const shift = expenseData.firstInstallmentInNextMonth ? 1 : 0;
      
      for (let i = startInstallment; i <= totalInst; i++) {
        const offset = (i - startInstallment) + shift;
        
        // Compute future month
        const [y, m] = baseMonth.split('-').map(Number);
        const futDateObj = new Date(y, m - 1 + offset, 1);
        const futY = futDateObj.getFullYear();
        const futM = String(futDateObj.getMonth() + 1).padStart(2, '0');
        const futureMonth = `${futY}-${futM}`;
        
        // Compute future date
        const [, , d] = baseDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1 + offset, d);
        // Fallback checks for leap years/month end variations
        const finalY = dateObj.getFullYear();
        const finalM = String(dateObj.getMonth() + 1).padStart(2, '0');
        const finalD = String(dateObj.getDate()).padStart(2, '0');
        const futureDate = `${finalY}-${finalM}-${finalD}`;
        
        const parsedTitle = expenseData.title.trim();
        const hasInstallmentSuffix = /(?:\d+)\s*[\/／]\s*(?:\d+)$/.test(parsedTitle);
        const finalTitle = hasInstallmentSuffix ? parsedTitle : `${parsedTitle} ${i}/${totalInst}`;

        generatedExpenses.push({
          ...expenseData,
          id: `exp-${now}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          title: finalTitle,
          currentInstallment: i,
          month: futureMonth,
          date: futureDate,
          createdAt: now
        });
      }
      
      setData(prev => ({
        ...prev,
        expenses: [...generatedExpenses, ...prev.expenses]
      }));
      triggerNotification(`Lançadas automaticamente ${generatedExpenses.length} parcelas para "${expenseData.title}"!`);
      
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      };

      setData(prev => ({
        ...prev,
        expenses: [newExpense, ...prev.expenses]
      }));
      triggerNotification(`Lançamento "${expenseData.title}" adicionado!`);
    }
  };

  const handleDeleteExpense = (id: string) => {
    const item = data.expenses.find(e => e.id === id);
    if (!item) return;

    setData(prev => {
      let finalExpenses = prev.expenses;
      if (item.isInstallment && item.createdAt) {
        // Remove all installments generated in this same batch/purchase (matching isInstallment and createdAt)
        finalExpenses = prev.expenses.filter(e => !(e.isInstallment && e.createdAt === item.createdAt));
      } else {
        finalExpenses = prev.expenses.filter(e => e.id !== id);
      }
      return {
        ...prev,
        expenses: finalExpenses
      };
    });

    if (item.isInstallment && item.createdAt) {
      const cleanTitle = item.title.replace(/\s*\d+\s*[\/／]\s*\d+\s*$/, '').trim();
      triggerNotification(`Lançamento parcelado "${cleanTitle}" e todas as suas parcelas foram excluídos.`);
    } else {
      triggerNotification(`Lançamento "${item.title}" removido com sucesso.`);
    }
  };

  const handleUpdateExpense = (id: string, updatedFields: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    setData(prev => {
      const expenses = prev.expenses.map(exp => {
        if (exp.id === id) {
          const merged = { ...exp, ...updatedFields };
          if (updatedFields.date) {
            merged.month = updatedFields.date.substring(0, 7);
          }
          return merged;
        }
        return exp;
      });
      return { ...prev, expenses };
    });
    triggerNotification('Lançamento de saída atualizado com sucesso!');
  };

  const handleAddRevenue = (revenueData: Omit<Revenue, 'id' | 'createdAt'>) => {
    const newRevenue: Revenue = {
      ...revenueData,
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    setData(prev => ({
      ...prev,
      revenues: [newRevenue, ...(prev.revenues || [])]
    }));
    triggerNotification(`Rendimento "${revenueData.title}" adicionado!`);
  };

  const handleDeleteRevenue = (id: string) => {
    const item = (data.revenues || []).find(r => r.id === id);
    setData(prev => ({
      ...prev,
      revenues: (prev.revenues || []).filter(r => r.id !== id)
    }));
    if (item) {
      triggerNotification(`Rendimento "${item.title}" removido com sucesso.`);
    }
  };

  // Update ideal category limits
  const handleUpdateCategoryBudget = (category: string, idealLimit: number) => {
    setData(prev => {
      const idx = prev.categoryBudgets.findIndex(b => b.category === category);
      const budgetsCopy = [...prev.categoryBudgets];
      if (idx !== -1) {
        budgetsCopy[idx] = { category, idealLimit };
      } else {
        budgetsCopy.push({ category, idealLimit });
      }
      return { ...prev, categoryBudgets: budgetsCopy };
    });
    triggerNotification(`Meta limite de ${category} reajustada.`);
  };

  // Save current month's configuration adjustments
  const handleSaveMonthConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const sal = parseFloat(salaryInput);
    if (isNaN(sal) || sal < 0) {
      triggerNotification('O salário inserido deve ser um número positivo.', 'error');
      return;
    }

    setData(prev => {
      const idx = prev.monthlyBudgets.findIndex(b => b.month === selectedMonth);
      const budgetsCopy = [...prev.monthlyBudgets];
      
      const newBudget: MonthlyBudget = {
        month: selectedMonth,
        salary: sal,
        targetSavingsPercentage: savingsInput
      };

      if (idx !== -1) {
        budgetsCopy[idx] = newBudget;
      } else {
        budgetsCopy.push(newBudget);
      }

      return {
        ...prev,
        monthlyBudgets: budgetsCopy,
        // Update default values to match latest configured inputs
        defaultMonthlySalary: sal,
        defaultTargetSavingsPercentage: savingsInput
      };
    });

    setShowConfigPanel(false);
    triggerNotification(`Planejamento de ${formatMonthName(selectedMonth)} foi atualizado.`);
  };

  // JSON Export / Import handlers
  const handleExportData = () => {
    exportDataAsJSON(data);
    triggerNotification('Backup exportado com sucesso.', 'info');
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const importedData = importDataFromJSON(fileContent);
        
        setData(importedData);
        triggerNotification('Seus dados foram importados com sucesso!');
      } catch (err: any) {
        alert(`Falha na importação: ${err.message || 'Formato incorreto'}`);
      }
    };
    reader.readAsText(file);
    // Clear input after handle
    e.target.value = '';
  };

  // Destructive reset triggered from custom modal
  const handleRealClearData = () => {
    const emptyData: AppData = {
      expenses: [],
      revenues: [],
      categoryBudgets: [
        { category: 'Alimentação', idealLimit: 0.00 },
        { category: 'Presentes', idealLimit: 0.00 },
        { category: 'Saúde', idealLimit: 0.00 },
        { category: 'Moradia', idealLimit: 0.00 },
        { category: 'Transporte', idealLimit: 0.00 },
        { category: 'Vestuário', idealLimit: 0.00 },
        { category: 'Lazer & Entretenimento', idealLimit: 0.00 },
        { category: 'Serviços de utilidade pública', idealLimit: 0.00 },
        { category: 'Viagens', idealLimit: 0.00 },
        { category: 'Tecnologia & Eletrônicos', idealLimit: 0.00 },
        { category: 'Cuidados Pessoais', idealLimit: 0.00 },
        { category: 'Assinaturas', idealLimit: 0.00 },
        { category: 'Educação & Profissional', idealLimit: 0.00 },
        { category: 'Outros', idealLimit: 0.00 }
      ],
      monthlyBudgets: [],
      defaultMonthlySalary: 0.00,
      defaultTargetSavingsPercentage: 20
    };

    // Limpeza completa em todos os níveis
    localStorage.clear();
    saveAppData(emptyData);
    setData(emptyData);
    setShowDeleteConfirm(false);

    triggerNotification('Todos os dados foram completamente limpos!', 'success');

    // Forçar o recarregamento total da página para resetar todos os estados de componentes internos e campos de input
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleClearData = () => {
    setShowDeleteConfirm(true);
  };

  // Aggregated analytics values for selected month
  const expensesInMonth = data.expenses.filter(e => e.month === selectedMonth);
  const totalSpent = expensesInMonth.reduce((sum, item) => sum + item.value, 0);

  // Calcular divida de parcelas futuras do mes analisado
  const futureInstallmentsDebt = expensesInMonth.reduce((sum, exp) => {
    const info = getInstallmentInfo(exp);
    const isInst = info.hasInfo || exp.isInstallment;
    if (isInst && info.remaining > 0) {
      return sum + (exp.value * info.remaining);
    }
    return sum;
  }, 0);

  const revenuesInMonth = (data.revenues || []).filter(r => r.month === selectedMonth);
  const totalRevenues = revenuesInMonth.reduce((sum, item) => sum + item.value, 0);

  // Se o usuário lançou pelo menos um rendimento, o salário que usamos para os cartões passa a ser a soma totalRevenues.
  // Senão, adota activeBudget.salary como fallback padrão do mês para não aparecer zerado.
  const currentMonthSalary = revenuesInMonth.length > 0 ? totalRevenues : activeBudget.salary;

  // Gasto real por categoria
  const expensesByCategory = expensesInMonth.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.value;
    return acc;
  }, {} as Record<string, number>);

  // Média acumulada geral de todas as despesas por mês
  const uniqueMonthsWithExpenses = Array.from(new Set(data.expenses.map(e => e.month)));
  const totalSpentHistory = data.expenses.reduce((sum, item) => sum + item.value, 0);
  const overallAverageSpent = uniqueMonthsWithExpenses.length > 0 
    ? totalSpentHistory / uniqueMonthsWithExpenses.length 
    : totalSpent;

  return (
    <div className={`min-h-screen bg-[#0a0a0a] flex flex-col items-center text-white ${privacyMode ? 'privacy-mode-active' : ''}`}>
      
      {/* GLOWING NOTIFICATION TOAST */}
      {showNotification && (
        <div 
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold z-50 flex items-center gap-2 animate-fade-in ${
            showNotification.type === 'error' 
              ? 'bg-rose-950 text-rose-100 border-rose-800' 
              : showNotification.type === 'info'
              ? 'bg-indigo-950 text-indigo-100 border-indigo-800'
              : 'bg-emerald-950 text-emerald-100 border-emerald-800'
          }`}
          id="toast-notification"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{showNotification.message}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="w-full bg-[#111111] border-b border-white/5 shrink-0 text-white" id="main-app-header">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 select-none shrink-0" id="main-brand-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-full h-full">
                <defs>
                  {/* Gradiente de Fundo Premium (Efeito Espacial Profundo) */}
                  <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#030712" />
                  </radialGradient>
                  
                  {/* Gradiente Principal Fintech (Esmeralda para Turquesa) */}
                  <linearGradient id="fintechGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#2DD4BF" />
                  </linearGradient>

                  {/* Gradiente para a Borda com Efeito de Vidro (Glassmorphism) */}
                  <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
                  </linearGradient>

                  {/* Filtro de Brilho Neon para o Ponto de Convergência */}
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Base do Ícone: Cantos Arredondados com Borda Subtil */}
                <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#bgGlow)" />
                <rect x="16" y="16" width="480" height="480" rx="120" fill="none" stroke="url(#borderGrad)" strokeWidth="4" />

                {/* Símbolo Centralizado Otimizado (Preenche melhor com scale 1.65x) */}
                <g transform="translate(41, 95) scale(1.65)">
                  
                  {/* Linhas de Grelha de Fundo (Simula Análise e Precisão) */}
                  <line x1="30" y1="200" x2="250" y2="200" stroke="#ffffff" strokeOpacity={0.04} strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="30" y1="140" x2="250" y2="140" stroke="#ffffff" strokeOpacity={0.04} strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="30" y1="80" x2="250" y2="80" stroke="#ffffff" strokeOpacity={0.04} strokeWidth="2" strokeDasharray="6 6" />

                  {/* Barra 1 (Crescimento Inicial - Baixa Opacidade) */}
                  <rect x="40" y="145" width="32" height="55" rx="8" fill="url(#fintechGrad)" opacity={0.3} />

                  {/* Barra 2 (Consolidação de Capital - Média Opacidade) */}
                  <rect x="96" y="95" width="32" height="105" rx="8" fill="url(#fintechGrad)" opacity={0.6} />

                  {/* Barra 3 (Performance de Topo e Sucesso - Opacidade Máxima) */}
                  <rect x="152" y="35" width="32" height="165" rx="8" fill="url(#fintechGrad)" />

                  {/* Curva Dinâmica de Fluxo de Caixa (Seta Ascendente) */}
                  <path d="M 20,175 C 60,170 100,145 136,95 C 166,55 205,30 225,10" 
                        fill="none" 
                        stroke="url(#fintechGrad)" 
                        strokeWidth="14" 
                        strokeLinecap="round" />
                        
                  {/* Cabeça da Seta (Aceleração de Mercado) */}
                  <path d="M 180,10 L 227,8 L 225,55" 
                        fill="none" 
                        stroke="url(#fintechGrad)" 
                        strokeWidth="14" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" />
                        
                  {/* Ponto de Brilho Ativo (Sucesso e Alvo Financeiro Alcançado) */}
                  <circle cx="225" cy="10" r="14" fill="#ffffff" filter="url(#neonGlow)" />
                  <circle cx="225" cy="10" r="6" fill="#2DD4BF" />
                </g>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold font-sans tracking-tight">Dashboard de Finanças Pessoais</h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Planejamento & Controle</p>
            </div>
          </div>

          {/* Navegação Mensal */}
          <div className="flex items-center bg-[#1c1c1c] p-1.5 rounded-2xl border border-white/5" id="month-navigation">
            <button 
              onClick={handlePrevMonth}
              className="p-1 px-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer text-slate-300"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-3 min-w-[130px] text-center">
              <span className="text-xs text-slate-500 block font-bold leading-none font-mono">Competência</span>
              <span className="text-sm font-bold text-white font-sans mt-0.5 inline-block">
                {formatMonthName(selectedMonth)}
              </span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1 px-1.5 hover:bg-white/5 hover:text-white rounded-xl transition-all cursor-pointer text-slate-300"
              title="Próximo Mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Ações de Dados e Backup */}
          <div className="flex flex-wrap items-center gap-2" id="action-controls-row">
            {/* Olho - Modo Privacidade */}
            <button
              onClick={() => {
                const nv = !privacyMode;
                setPrivacyMode(nv);
                triggerNotification(nv ? 'Modo de privacidade ativado! Os valores foram borrados para locais públicos.' : 'Modo de privacidade desativado. Valores visíveis.', 'info');
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${
                privacyMode 
                  ? 'bg-amber-950/40 text-amber-400 border-amber-500/30 shadow-md shadow-amber-950/20' 
                  : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
              }`}
              title={privacyMode ? 'Mostrar valores (Modo público)' : 'Esconder valores (Modo privado)'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Esconder Teto de Gastos (Apenas Mobile/Tablet) */}
            <button
              onClick={() => {
                const nv = !hideMobileBudgets;
                setHideMobileBudgets(nv);
                triggerNotification(nv ? 'Seção de Teto de Gastos ocultada para telas menores.' : 'Seção de Teto de Gastos visível.', 'info');
              }}
              className={`lg:hidden w-8 h-8 flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${
                hideMobileBudgets 
                  ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/30 shadow-md shadow-indigo-950/20' 
                  : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
              }`}
              title={hideMobileBudgets ? 'Mostrar Teto de Gastos Adotado' : 'Esconder Teto de Gastos Adotado'}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Editar Salário e Metas */}
            <button
              onClick={() => setShowConfigPanel(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                showConfigPanel 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
                  : 'bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border-white/5'
              }`}
              title="Configurações do Orçamento Mensal"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurar Mês
            </button>

            {/* Exportar */}
            <button
              onClick={handleExportData}
              className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border border-white/5 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Exportar dados para um arquivo JSON local"
            >
              <Download className="w-3.5 h-3.5" />
              Backup JSON
            </button>

            {/* Importar */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              className="hidden" 
            />
            <button
              onClick={handleImportButtonClick}
              className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 border border-white/5 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Importar dados de um backup anterior"
            >
              <Upload className="w-3.5 h-3.5" />
              Recuperar
            </button>

            <button
              onClick={handleClearData}
              className="p-2 bg-[#1c1c1c] hover:bg-rose-950/20 text-slate-400 hover:text-rose-450 border border-white/5 rounded-xl transition-all cursor-pointer"
              title="Remover Registros do Navegador"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* PAINEL FLUTUANTE DE CONFIGURAÇÃO DE SALÁRIO ANCORADO NO HEADER */}
      {showConfigPanel && (
        <div className="w-full bg-[#141414] border-b border-white/5 text-white animate-fade-in" id="config-panel">
          <div className="w-full max-w-7xl mx-auto px-4 py-5 sm:px-6">
            <form onSubmit={handleSaveMonthConfig} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Salário Ideal / Rendimento Fixo (R$) — {formatMonthName(selectedMonth)}
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm">
                    R$
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-indigo-500 font-semibold"
                    placeholder="Ex: 5000.00"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Meta de Poupança Ideal (%)</span>
                  <span className="text-indigo-400 font-bold font-mono">{savingsInput}%</span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    className="flex-1 accent-indigo-500 bg-zinc-900 h-1.5 rounded-lg cursor-pointer"
                    value={savingsInput}
                    onChange={(e) => setSavingsInput(parseInt(e.target.value))}
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    Poupe: {formatCurrency(parseFloat(salaryInput || '0') * (savingsInput / 100))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Salvar Orçamento
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigPanel(false)}
                  className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL (DASHBOARD) */}
      <main className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 flex-1 space-y-4" id="dashboard-main-area">
        
        {/* VIEW SELECTOR TAB BAR */}
        <div className="flex bg-[#121212] p-1 rounded-xl border border-white/5 max-w-[325px]" id="view-selector-tabs">
          <button
            onClick={() => setActiveView('monthly')}
            type="button"
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeView === 'monthly'
                ? 'bg-[#1c1c1c] text-white border border-white/5 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Painel Mensal
          </button>
          <button
            onClick={() => setActiveView('annual')}
            type="button"
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
              activeView === 'annual'
                ? 'bg-[#1c1c1c] text-white border border-white/5 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resumo Anual ({selectedMonth.substring(0, 4)})
          </button>
        </div>

        {activeView === 'monthly' ? (
          <>
            {/* ROW 1: CARDS GERAIS DE CONTROLE */}
            <KpiCards 
              totalSpent={totalSpent}
              salary={activeBudget.salary}
              targetSavingsPercentage={activeBudget.targetSavingsPercentage}
              extraIncome={totalRevenues}
              selectedMonth={selectedMonth}
              futureInstallmentsDebt={futureInstallmentsDebt}
              expenses={data.expenses}
            />

            {/* ROW 2: GRÁFICOS INTERATIVOS E TETOS POR CATEGORIA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="middle-dashboard-layout">
              {/* Gráficos Recharts (8 colunas) */}
              <div className="lg:col-span-8">
                <ChartsView 
                  expenses={data.expenses}
                  categoryBudgets={data.categoryBudgets}
                  selectedMonth={selectedMonth}
                />
              </div>

              {/* Planejamento de Metas Limites por Categoria (4 colunas) */}
              <div className={`lg:col-span-4 lg:h-[590px] ${hideMobileBudgets ? 'hidden lg:block' : ''}`}>
                <CategoryBudgets 
                  categoryBudgets={data.categoryBudgets}
                  expensesByCategory={expensesByCategory}
                  onUpdateBudget={handleUpdateCategoryBudget}
                />
              </div>
            </div>

            {/* ROW 3: TABELA DE LANÇAMENTOS E ADICIONAR DESPESA */}
            <div className="p-px rounded-3xl bg-transparent" id="bottom-tracker-layout">
              <ExpenseTracker 
                expenses={data.expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onUpdateExpense={handleUpdateExpense}
                revenues={data.revenues || []}
                onAddRevenue={handleAddRevenue}
                onDeleteRevenue={handleDeleteRevenue}
                selectedMonth={selectedMonth}
              />
            </div>
          </>
        ) : (
          <AnnualSummary 
            expenses={data.expenses} 
            revenues={data.revenues || []} 
            selectedYear={selectedMonth.substring(0, 4)} 
          />
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#111111] border-t border-white/5 text-slate-400 py-6 text-center mt-12 text-xs shrink-0 font-medium">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>
            Controle de Orçamento Pessoal • Todos os dados permanecem salvos em cache local (<code className="bg-zinc-900 px-1 rounded text-rose-450 font-mono">localStorage</code>).
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Desenvolvido sob medida em Português (Brasil)
          </p>
        </div>
      </footer>

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE DADOS */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/5 max-w-md w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/40 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Apagar todos os dados registrados?
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tem certeza de que deseja limpar completamente todas as despesas, rendimentos, limites e planejamentos do navegador? Esta ação é irreversível.
              </p>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#252525] text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRealClearData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
