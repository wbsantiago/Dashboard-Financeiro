import type { CreditCard, Expense } from '../types';

export interface CardFilterOption {
  value: string;
  label: string;
  cardId?: string;
  lastDigits?: string;
}

export function getCardFilterOptions(expenses: Expense[], cards: CreditCard[]): CardFilterOption[] {
  const options: CardFilterOption[] = cards.map(card => ({
    value: `id:${card.id}`, label: `${card.name} (•••• ${card.lastDigits})`, cardId: card.id, lastDigits: card.lastDigits,
  }));
  for (const expense of expenses) {
    if (!expense.cardId && !expense.cardLastDigits) continue;
    const known = options.some(option => expense.cardId ? option.cardId === expense.cardId : option.lastDigits === expense.cardLastDigits);
    if (known) continue;
    options.push({
      value: expense.cardId ? `id:${expense.cardId}` : `digits:${expense.cardLastDigits}`,
      label: `${expense.cardNickname || 'Cartão'}${expense.cardLastDigits ? ` (•••• ${expense.cardLastDigits})` : ''}`,
      cardId: expense.cardId, lastDigits: expense.cardLastDigits,
    });
  }
  return options;
}

export function matchesCardFilter(expense: Expense, value: string, options: CardFilterOption[]): boolean {
  if (value === 'all') return true;
  const option = options.find(item => item.value === value);
  if (!option) return false;
  if (expense.cardId) return expense.cardId === option.cardId;
  return !!option.lastDigits && expense.cardLastDigits === option.lastDigits;
}
