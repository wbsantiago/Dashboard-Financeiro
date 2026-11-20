/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppData, Expense, Revenue, CategoryBudget, MonthlyBudget } from '../types';
import { readRecurrenceFields } from './recurrence';
import { validDate, validDay } from './paymentDates';
import { getCurrentMonthStr, getLocalDateStr } from './format';
import { MAX_BACKUP_BYTES } from './backupFiles';
import { getNativeLocalData, saveNativeLocalData, restoreNativeLocalData } from './nativePersistence';
export { saveBackupFile as exportDataAsJSON } from './backupFiles';

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
  'Alimentação': '#fb4e63',             // Vermelho
  'Presentes': '#f54da2',               // Rosa
  'Saúde': '#16c784',                   // Esmeralda
  'Moradia': '#398bff',                 // Azul
  'Transporte': '#00bfdd',              // Ciano
  'Vestuário': '#ad63ff',               // Roxo
  'Lazer & Entretenimento': '#ffb020',  // Âmbar
  'Serviços de utilidade pública': '#00bfa5', // Teal
  'Viagens': '#f5cc27',                 // Amarelo
  'Tecnologia & Eletrônicos': '#7b78ff', // Indigo
  'Cuidados Pessoais': '#ff6d7f',       // Rose
  'Assinaturas': '#99d52e',             // Limão
  'Educação & Profissional': '#e95cfa',  // Fúcsia
  'Outros': '#94a3b8',                  // Cinza
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
  'Poupança': '#16c784',       // Emerald
  'Pagamento': '#398bff',       // Blue
  'FreeLancer': '#00bfdd',      // Cyan
  'VA': '#f5cc27',              // Yellow
  'Outros': '#94a3b8',          // Gray
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
  creditCards: [],
  defaultMonthlySalary: 0.00,
  defaultTargetSavingsPercentage: 20,
  defaultCardClosingDay: 5
};

// Initialize or load data from LocalStorage
export function loadAppData(): AppData {
  const native = getNativeLocalData();
  if (native) return native;
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      // Basic schema health check
      if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.categoryBudgets)) {
        if (!parsed.revenues) {
          parsed.revenues = [];
        }
        return { ...structuredClone(INITIAL_MOCK_DATA), ...parsed } as AppData;
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
  if (saveNativeLocalData(data)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('local-save-failed'));
    console.error('Error saving app data to localStorage:', err);
  }
}

// Parse imported JSON
export async function restoreAppData(data: AppData) {
  if (await restoreNativeLocalData(data)) return;
  // Unlike background saves, an explicit restore must report failure before replacing the screen.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function importDataFromJSON(jsonString: string): AppData {
  if (new TextEncoder().encode(jsonString).length > MAX_BACKUP_BYTES) throw new Error('Use um backup de até 10 MB.');
  let envelope: any;
  try { envelope = JSON.parse(jsonString.replace(/^\uFEFF/, '')); }
  catch { throw new Error('O arquivo não contém um backup JSON válido.'); }
  if (envelope?.backupVersion !== undefined && envelope.backupVersion !== 1) throw new Error('Versão de backup não suportada.');
  const parsed = envelope?.backupVersion === 1 ? envelope.data : envelope;
  
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
  const nonnegative = (value: unknown, name: string) => {
    if (value !== undefined && (value === null || typeof value !== 'number' && typeof value !== 'string' || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`Valor inválido em ${name}.`);
  };
  const records = (key: string, numericFields: string[]) => {
    if (parsed[key] === undefined) return;
    if (!Array.isArray(parsed[key]) || parsed[key].length > 20000) throw new Error(`Lista inválida em ${key}.`);
    const ids = new Set<string>();
    for (const item of parsed[key]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Registro inválido em ${key}.`);
      numericFields.forEach(field => nonnegative(item[field], `${key}.${field}`));
      if (item.id !== undefined) {
        if (typeof item.id !== 'string' || !item.id || item.id.length > 150 || ids.has(item.id)) throw new Error(`Identificador inválido ou repetido em ${key}.`);
        ids.add(item.id);
      }
      if (item.month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)) throw new Error('Mês inválido no backup.');
      if (item.date !== undefined) {
        const date = new Date(`${item.date}T12:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== item.date) throw new Error('Data inválida no backup.');
      }
      if (item.dueDate !== undefined && item.dueDate !== null && !validDate(item.dueDate)) throw new Error('Vencimento inválido no backup.');
      for (const field of ['closingDay', 'dueDay']) if (item[field] !== undefined && !validDay(item[field])) throw new Error('Dia do cartão inválido no backup.');
      if (item.targetSavingsPercentage !== undefined && Number(item.targetSavingsPercentage) > 100) throw new Error('Meta de poupança inválida.');
      if (item.cardClosingDay !== undefined && (!Number.isInteger(Number(item.cardClosingDay)) || Number(item.cardClosingDay) > 31)) throw new Error('Dia de fechamento inválido.');
    }
  };
  records('expenses', ['value', 'createdAt', 'totalInstallments', 'currentInstallment']);
  records('revenues', ['value', 'createdAt']); records('categoryBudgets', ['idealLimit']);
  records('monthlyBudgets', ['salary', 'targetSavingsPercentage', 'cardClosingDay']); records('creditCards', []);
  if (parsed.primaryCardId != null && (typeof parsed.primaryCardId !== 'string' || !parsed.creditCards?.some((c) => c.id === parsed.primaryCardId && validDay(c.closingDay)))) throw new Error('Cartão principal inválido no backup.');
  nonnegative(parsed.defaultMonthlySalary, 'salário padrão');
  nonnegative(parsed.defaultTargetSavingsPercentage, 'poupança padrão');
  nonnegative(parsed.defaultCardClosingDay, 'fechamento padrão');
  if (Number(parsed.defaultTargetSavingsPercentage) > 100 || (parsed.defaultCardClosingDay !== undefined && (!Number.isInteger(Number(parsed.defaultCardClosingDay)) || Number(parsed.defaultCardClosingDay) > 31))) throw new Error('Configuração padrão inválida.');
  
  // Clean, map, and return matching schema
  const cleanData: AppData = {
    expenses: parsed.expenses.map((e: any, i: number) => ({
      id: e.id || `imported-${Date.now()}-${i}`,
      title: String(e.title || 'Despesa Importada'),
      value: Number(e.value || 0),
      category: String(e.category || 'Outros'),
      month: String(e.month || getCurrentMonthStr()),
      isInstallment: Boolean(e.isInstallment),
      totalInstallments: e.totalInstallments ? Number(e.totalInstallments) : undefined,
      currentInstallment: e.currentInstallment ? Number(e.currentInstallment) : undefined,
      ...(e.firstInstallmentInNextMonth !== undefined ? { firstInstallmentInNextMonth: Boolean(e.firstInstallmentInNextMonth) } : {}),
      date: String(e.date || getLocalDateStr()),
      createdAt: e.createdAt !== undefined ? Number(e.createdAt) : Date.now(),
      paid: e.paid !== undefined ? Boolean(e.paid) : false,
      paymentMethod: e.paymentMethod,
      ...(e.dueDate !== undefined ? { dueDate: e.dueDate } : {}),
      cardLastDigits: e.cardLastDigits,
      cardId: e.cardId,
      cardNickname: e.cardNickname,
      ...readRecurrenceFields(e),
    })),
    revenues: Array.isArray(parsed.revenues)
      ? parsed.revenues.map((r: any, i: number) => ({
          id: r.id || `imported-rev-${Date.now()}-${i}`,
          title: String(r.title || 'Rendimento Importado'),
          value: Number(r.value || 0),
          category: String(r.category || 'Outros Rendimentos'),
          month: String(r.month || getCurrentMonthStr()),
          date: String(r.date || getLocalDateStr()),
          createdAt: r.createdAt !== undefined ? Number(r.createdAt) : Date.now(),
          ...readRecurrenceFields(r),
        }))
      : [],
    categoryBudgets: parsed.categoryBudgets.map((b: any) => ({
      category: String(b.category),
      idealLimit: Number(b.idealLimit || 0),
      ...(b.archived === true && !DEFAULT_CATEGORIES.includes(String(b.category)) ? { archived: true } : {}),
    })),
    monthlyBudgets: Array.isArray(parsed.monthlyBudgets) 
      ? parsed.monthlyBudgets.map((m: any) => ({
          month: String(m.month),
          salary: Number(m.salary || 0),
          targetSavingsPercentage: Number(m.targetSavingsPercentage ?? 20),
          cardClosingDay: m.cardClosingDay !== undefined ? Number(m.cardClosingDay) : undefined
        }))
      : [],
    creditCards: Array.isArray(parsed.creditCards)
      ? parsed.creditCards.map((c: any) => ({
          id: String(c.id),
          name: String(c.name),
          lastDigits: String(c.lastDigits),
          ...(c.closingDay !== undefined ? { closingDay: c.closingDay } : {}),
          ...(c.dueDay !== undefined ? { dueDay: c.dueDay } : {})
        }))
      : [],
    ...(parsed.primaryCardId !== undefined ? { primaryCardId: parsed.primaryCardId } : {}),
    defaultMonthlySalary: Number(parsed.defaultMonthlySalary ?? 0),
    defaultTargetSavingsPercentage: Number(parsed.defaultTargetSavingsPercentage ?? 20),
    defaultCardClosingDay: parsed.defaultCardClosingDay !== undefined ? Number(parsed.defaultCardClosingDay) : 5
  };
  
  return cleanData;
}
