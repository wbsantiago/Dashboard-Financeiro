import type { AppData, Expense, Revenue } from '../types';
import { DEFAULT_CATEGORIES } from './storage';

// Deterministic examples for the development preview; never saved to a user's account.
export function createDemoData(year: number): AppData {
  const expenses: Expense[] = [];
  const revenues: Revenue[] = [];
  const limits: Record<string, number> = {
    'Alimentação': 900, 'Presentes': 150, 'Saúde': 250, 'Moradia': 1600,
    'Transporte': 450, 'Vestuário': 200, 'Lazer & Entretenimento': 300,
    'Serviços de utilidade pública': 350, 'Viagens': 300, 'Tecnologia & Eletrônicos': 350,
    'Cuidados Pessoais': 150, 'Assinaturas': 100, 'Educação & Profissional': 200, 'Outros': 100,
  };
  const cards = [
    { id: 'demo-card-daily', name: 'Cartão do dia a dia', lastDigits: '1234' },
    { id: 'demo-card-shopping', name: 'Cartão de compras', lastDigits: '5678' },
  ];
  const fixed: [string, number, string, Expense['paymentMethod']][] = [
    ['Aluguel', 1350, 'Moradia', 'pix'],
    ['Condomínio', 250, 'Moradia', 'boleto'],
    ['Internet residencial', 99.9, 'Serviços de utilidade pública', 'boleto'],
    ['Estacionamento', 180, 'Transporte', 'pix'],
    ['Barbeiro', 65, 'Cuidados Pessoais', 'pix'],
    ['Streaming', 44.9, 'Assinaturas', 'card'],
    ['Academia', 119.9, 'Saúde', 'card'],
    ['Curso de inglês', 199, 'Educação & Profissional', 'card'],
  ];
  const now = new Date().toISOString().slice(0, 10);
  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, '0')}`;
    const date = (day: number) => `${month}-${String(day).padStart(2, '0')}`;
    const add = (key: string, title: string, value: number, category: string, day: number,
      paymentMethod: Expense['paymentMethod'] = 'pix', extra: Partial<Expense> = {}) => {
      expenses.push({ id: `demo-${year}-${m}-${key}`, title, value: Math.round(value * 100) / 100,
        category, month, date: date(day), createdAt: Date.UTC(year, m - 1, day, 12),
        isInstallment: false, paid: date(day) < now, paymentMethod,
        ...(paymentMethod === 'card' ? { cardId: cards[0].id, cardLastDigits: cards[0].lastDigits, cardNickname: cards[0].name } : {}),
        ...extra,
      });
    };
    fixed.forEach(([title, value, category, method], index) => add(`fixed-${index}`, title, value, category, 8 + index, method,
      { recurrenceId: `demo-${year}-fixed-${index}`, recurrenceIndex: m, recurrenceMonths: 12 }));
    add('market-1', 'Mercado — compra da quinzena', 340 + (m % 4) * 38, 'Alimentação', 10, 'card');
    add('market-2', 'Mercado — reposição do mês', 270 + (m % 3) * 44, 'Alimentação', 24, 'pix');
    add('lunch', 'Almoço e café fora de casa', 110 + (m % 5) * 21, 'Alimentação', 18, 'card');
    add('energy', 'Conta de energia', 145 + (m % 4) * 23, 'Serviços de utilidade pública', 12, 'boleto');
    add('water', 'Conta de água', 68 + (m % 3) * 8, 'Serviços de utilidade pública', 14, 'boleto');
    add('fuel', 'Combustível', 210 + (m % 4) * 35, 'Transporte', 16, 'card');
    add('pharmacy', 'Farmácia', 45 + (m % 3) * 39, 'Saúde', 20, 'pix');
    add('leisure', 'Cinema e jantar com amigos', 140 + (m % 4) * 48, 'Lazer & Entretenimento', 22, 'card');
    if (m % 2 === 0) add('clothes', 'Roupas e acessórios', 160 + m * 9, 'Vestuário', 19, 'card');
    if ([3, 5, 12].includes(m)) add('gifts', 'Presentes para a família', m === 12 ? 620 : 180, 'Presentes', 23, 'card');
    if ([1, 7, 12].includes(m)) add('trip', 'Viagem de férias', m === 7 ? 2900 : m === 12 ? 1650 : 850, 'Viagens', 26, 'pix');
    if (m === 10) add('medical', 'Consulta e exames de rotina — acompanhamento anual', 380, 'Saúde', 21, 'pix');
    if (m <= 6) add('laptop', 'Notebook para trabalho', 350, 'Tecnologia & Eletrônicos', 17, 'card', {
      isInstallment: true, currentInstallment: m, totalInstallments: 6, createdAt: Date.UTC(year, 0, 17, 12),
      cardId: cards[1].id, cardLastDigits: cards[1].lastDigits, cardNickname: cards[1].name,
    });
    if (m >= 9) add('desk', 'Mesa para escritório', 290, 'Moradia', 18, 'card', {
      isInstallment: true, currentInstallment: m - 8, totalInstallments: 4, createdAt: Date.UTC(year, 8, 18, 12),
      cardId: cards[1].id, cardLastDigits: cards[1].lastDigits, cardNickname: cards[1].name,
    });
    const income = (key: string, title: string, value: number, category: string, day: number, recurring = false) => {
      revenues.push({ id: `demo-${year}-${m}-income-${key}`, title, value, category, month, date: date(day),
        createdAt: Date.UTC(year, m - 1, day, 12),
        ...(recurring ? { recurrenceId: `demo-${year}-income-${key}`, recurrenceIndex: m, recurrenceMonths: 12 } : {}),
      });
    };
    income('salary', 'Salário', m <= 6 ? 5200 : 5500, 'Pagamento', 6, true);
    income('food', 'Vale-alimentação', 900, 'VA', 6, true);
    if (m % 3 === 0) income('freelance', 'Projeto freelance', 550 + m * 50, 'FreeLancer', 20);
    if (m === 11 || m === 12) income('bonus', 'Décimo terceiro — parcela', 2750, 'Pagamento', 25);
    if (m === 4) income('refund', 'Reembolso', 220, 'Outros', 16);
  }
  return {
    expenses, revenues, creditCards: cards,
    categoryBudgets: DEFAULT_CATEGORIES.map(category => ({ category, idealLimit: limits[category] || 100 })),
    monthlyBudgets: Array.from({ length: 12 }, (_, i) => ({ month: `${year}-${String(i + 1).padStart(2, '0')}`,
      salary: i < 6 ? 6100 : 6400, targetSavingsPercentage: i === 6 ? 10 : 20, cardClosingDay: 5 })),
    defaultMonthlySalary: 6400, defaultTargetSavingsPercentage: 20, defaultCardClosingDay: 5,
  };
}
