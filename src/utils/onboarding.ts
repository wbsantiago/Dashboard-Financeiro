type TourStore = Pick<Storage, 'getItem' | 'setItem'>;
export type TourChoice = 'completed' | 'dismissed';
function browserStore(): TourStore | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}
export function tourStorageKey(userId: string | null): string {
  return `financas10-tour-v1:${userId === null ? 'local' : `account:${encodeURIComponent(userId)}`}`;
}
export function readTourChoice(key: string, storage = browserStore()): TourChoice | null {
  try {
    const value = storage?.getItem(key);
    return value === 'completed' || value === 'dismissed' ? value : null;
  } catch { return null; }
}
export function saveTourChoice(key: string, choice: TourChoice, storage = browserStore()): boolean {
  try { storage?.setItem(key, choice); return !!storage; }
  catch { return false; }
}

export const dashboardTourSteps = [
  { target: 'month-navigation', title: 'Escolha o mês', description: 'Use estas setas para escolher o mês que deseja organizar. Os lançamentos e os valores do painel acompanham o mês selecionado.' },
  { target: 'add-revenue-button', title: 'Registre suas entradas', description: 'Clique em Adicionar entrada para informar salário e outros recebimentos. Preencha descrição, valor, data e categoria no formulário.' },
  { target: 'add-expense-button', title: 'Adicione suas despesas', description: 'Clique em Adicionar despesa para registrar um gasto. No formulário, você também escolhe a forma de pagamento, parcelas ou recorrência mensal.' },
  { target: 'monthly-totals', title: 'Acompanhe o resumo do mês', description: 'Aqui você vê as entradas, as despesas lançadas e o saldo do mês. As despesas incluem os gastos cadastrados, mesmo que ainda não estejam marcados como pagos.' },
  { target: 'view-selector-tabs', title: 'Consulte os detalhes', description: 'Em Lançamentos do mês, você encontra suas despesas e entradas, com busca e filtros. Use Visão geral para voltar ao resumo e Visão do ano para comparar os meses.' },
] as const;
