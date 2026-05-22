/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Formata valores numéricos para Real Brasileiro (R$)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Retorna uma string elegante de mês e ano por extenso (Português de Portugal/Brasil)
export function formatMonthName(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 15);
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const formatted = formatter.format(date);
  // Primeira letra maiúscula
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Retorna apenas o nome por extenso do mês
export function getJustMonthName(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 15);
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
  const formatted = formatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Formata data padrão (YYYY-MM-DD) para DD/MM/YYYY
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Obtém o mês corrente no formato YYYY-MM
export function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Analisa e extrai informações detalhadas de parcelamento (por propriedades ou por título como "9/12")
export function getInstallmentInfo(exp: {
  title: string;
  isInstallment?: boolean;
  currentInstallment?: number;
  totalInstallments?: number;
}) {
  if (exp.isInstallment && exp.currentInstallment !== undefined && exp.totalInstallments !== undefined) {
    return {
      current: exp.currentInstallment,
      total: exp.totalInstallments,
      remaining: exp.totalInstallments - exp.currentInstallment,
      hasInfo: true
    };
  }
  
  // Tenta extrair padrões tipo "9/12", "9 / 12", "9 de 12" no título
  const regex = /(?:^|\s)\(?(\d+)\s*[\/／]\s*(\d+)\)?(?:$|\s)/i;
  const match = exp.title.match(regex);
  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    if (current > 0 && total >= current) {
      return {
        current,
        total,
        remaining: total - current,
        hasInfo: true
      };
    }
  }
  return {
    current: 1,
    total: 1,
    remaining: 0,
    hasInfo: false
  };
}
