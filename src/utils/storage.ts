/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppData, Expense, Revenue, CategoryBudget, MonthlyBudget } from '../types';

const STORAGE_KEY = 'controle_financeiro_data';

// Standard Categories
export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Presentes',
  'Saúde',
  'Moradia',
  'Transporte',
  'Vestuário',
  'Lazer & Entretenimento',
  'Serviços de utilidade pública',
  'Viagens',
  'Tecnologia & Eletrônicos',
  'Cuidados Pessoais',
  'Assinaturas',
  'Educação & Profissional',
  'Outros'
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#ef4444',             // Vermelho
  'Presentes': '#ec4899',               // Rosa
  'Saúde': '#10b981',                   // Esmeralda
  'Moradia': '#3b82f6',                 // Azul
  'Transporte': '#06b6d4',              // Ciano
  'Vestuário': '#a855f7',               // Roxo
  'Lazer & Entretenimento': '#f59e0b',  // Âmbar
  'Serviços de utilidade pública': '#14b8a6', // Teal
  'Viagens': '#eab308',                 // Amarelo
  'Tecnologia & Eletrônicos': '#6366f1', // Indigo
  'Cuidados Pessoais': '#f43f5e',       // Rose
  'Assinaturas': '#84cc16',             // Limão
  'Educação & Profissional': '#d946ef',  // Fúcsia
  'Outros': '#6b7280',                  // Cinza
};

export const CATEGORY_BG_COLORS: Record<string, string> = {
  'Alimentação': 'bg-red-500',
  'Presentes': 'bg-pink-500',
  'Saúde': 'bg-emerald-500',
  'Moradia': 'bg-blue-500',
  'Transporte': 'bg-cyan-500',
  'Vestuário': 'bg-purple-500',
  'Lazer & Entretenimento': 'bg-amber-500',
  'Serviços de utilidade pública': 'bg-teal-500',
  'Viagens': 'bg-yellow-500',
  'Tecnologia & Eletrônicos': 'bg-indigo-500',
  'Cuidados Pessoais': 'bg-rose-500',
  'Assinaturas': 'bg-lime-500',
  'Educação & Profissional': 'bg-fuchsia-500',
  'Outros': 'bg-gray-500',
};

export const CATEGORY_TEXT_COLORS: Record<string, string> = {
  'Alimentação': 'text-red-500',
  'Presentes': 'text-pink-500',
  'Saúde': 'text-emerald-500',
  'Moradia': 'text-blue-500',
  'Transporte': 'text-cyan-500',
  'Vestuário': 'text-purple-500',
  'Lazer & Entretenimento': 'text-amber-500',
  'Serviços de utilidade pública': 'text-teal-500',
  'Viagens': 'text-yellow-500',
  'Tecnologia & Eletrônicos': 'text-indigo-500',
  'Cuidados Pessoais': 'text-rose-500',
  'Assinaturas': 'text-lime-500',
  'Educação & Profissional': 'text-fuchsia-500',
  'Outros': 'text-gray-500',
};

// Categorias padrões de Rendimento (Receitas)
export const DEFAULT_REVENUE_CATEGORIES = [
  'Poupança',
  'Pagamento',
  'FreeLancer',
  'VA',
  'Outros'
];

export const REVENUE_CATEGORY_COLORS: Record<string, string> = {
  'Poupança': '#10b981',       // Emerald
  'Pagamento': '#3b82f6',       // Blue
  'FreeLancer': '#06b6d4',      // Cyan
  'VA': '#eab308',              // Yellow
  'Outros': '#6b7280',          // Gray
};

export const REVENUE_CATEGORY_BG_COLORS: Record<string, string> = {
  'Poupança': 'bg-emerald-500',
  'Pagamento': 'bg-blue-500',
  'FreeLancer': 'bg-cyan-500',
  'VA': 'bg-yellow-500',
  'Outros': 'bg-gray-500',
};

// Mock Initial Data
export const INITIAL_MOCK_DATA: AppData = {
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

// Initialize or load data from LocalStorage
export function loadAppData(): AppData {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      // Force clean reload if loading outdated categories format
      const hasOldFormat = !parsed.categoryBudgets || !parsed.categoryBudgets.some((cb: any) => cb.category === 'Presentes');
      if (hasOldFormat) {
        localStorage.clear();
        saveAppData(INITIAL_MOCK_DATA);
        return INITIAL_MOCK_DATA;
      }
      // Basic schema health check
      if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.categoryBudgets)) {
        if (!parsed.revenues) {
          parsed.revenues = [];
        }
        return parsed as AppData;
      }
    }
  } catch (err) {
    console.error('Error loading app data from localStorage:', err);
  }
  
  // Save initial fallback data if empty
  saveAppData(INITIAL_MOCK_DATA);
  return INITIAL_MOCK_DATA;
}

// Save data to LocalStorage
export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving app data to localStorage:', err);
  }
}

// Download state as a JSON file
export function exportDataAsJSON(data: AppData): void {
  try {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    // Create an anchor node to trigger download
    const exportFileDefaultName = `financeiro_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  } catch (err) {
    alert('Erro ao exportar os dados. Por favor, tente novamente.');
    console.error('Error exporting data:', err);
  }
}

// Parse imported JSON
export function importDataFromJSON(jsonString: string): AppData {
  const parsed = JSON.parse(jsonString);
  
  // Validate basic schema structure
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Conteúdo inválido: Arquivo JSON não é um objeto.');
  }
  
  if (!Array.isArray(parsed.expenses)) {
    throw new Error('Formato inválido: Campo "expenses" deve ser um array.');
  }

  if (!Array.isArray(parsed.categoryBudgets)) {
    throw new Error('Formato inválido: Campo "categoryBudgets" deve ser um array.');
  }
  
  // Clean, map, and return matching schema
  const cleanData: AppData = {
    expenses: parsed.expenses.map((e: any, i: number) => ({
      id: e.id || `imported-${Date.now()}-${i}`,
      title: String(e.title || 'Despesa Importada'),
      value: Number(e.value || 0),
      category: String(e.category || 'Outros'),
      month: String(e.month || new Date().toISOString().substring(0, 7)),
      isInstallment: Boolean(e.isInstallment),
      totalInstallments: e.totalInstallments ? Number(e.totalInstallments) : undefined,
      currentInstallment: e.currentInstallment ? Number(e.currentInstallment) : undefined,
      date: String(e.date || new Date().toISOString().split('T')[0]),
      createdAt: e.createdAt ? Number(e.createdAt) : Date.now()
    })),
    revenues: Array.isArray(parsed.revenues)
      ? parsed.revenues.map((r: any, i: number) => ({
          id: r.id || `imported-rev-${Date.now()}-${i}`,
          title: String(r.title || 'Rendimento Importado'),
          value: Number(r.value || 0),
          category: String(r.category || 'Outros Rendimentos'),
          month: String(r.month || new Date().toISOString().substring(0, 7)),
          date: String(r.date || new Date().toISOString().split('T')[0]),
          createdAt: r.createdAt ? Number(r.createdAt) : Date.now()
        }))
      : [],
    categoryBudgets: parsed.categoryBudgets.map((b: any) => ({
      category: String(b.category),
      idealLimit: Number(b.idealLimit || 0)
    })),
    monthlyBudgets: Array.isArray(parsed.monthlyBudgets) 
      ? parsed.monthlyBudgets.map((m: any) => ({
          month: String(m.month),
          salary: Number(m.salary || 0),
          targetSavingsPercentage: Number(m.targetSavingsPercentage || 30)
        }))
      : [],
    defaultMonthlySalary: Number(parsed.defaultMonthlySalary || 4500.00),
    defaultTargetSavingsPercentage: Number(parsed.defaultTargetSavingsPercentage || 30)
  };
  
  return cleanData;
}
