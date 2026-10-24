import type { RecurrenceFields, RecurrenceScope } from '../types';

export const MAX_RECURRENCE_MONTHS = 120;

export function validateRecurrenceMonths(months: number): void {
  if (!Number.isInteger(months) || months < 1 || months > MAX_RECURRENCE_MONTHS) {
    throw new Error(`Informe uma duração entre 1 e ${MAX_RECURRENCE_MONTHS} meses.`);
  }
}

// Always calculate from the original day, so Jan 31 -> Feb 28 -> Mar 31.
export function shiftMonthlyDate(date: string, offset: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match || !Number.isInteger(offset)) throw new Error('Informe uma data válida.');
  const [, year, month, day] = match.map(Number);
  const original = new Date(Date.UTC(year, month - 1, day));
  if (original.getUTCFullYear() !== year || original.getUTCMonth() !== month - 1 || original.getUTCDate() !== day) {
    throw new Error('Informe uma data válida.');
  }
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function readRecurrenceFields(value: RecurrenceFields & { isInstallment?: boolean }): RecurrenceFields {
  const { recurrenceId, recurrenceIndex, recurrenceMonths } = value;
  if (recurrenceId === undefined && recurrenceIndex === undefined && recurrenceMonths === undefined) return {};
  if (value.isInstallment === true || typeof recurrenceId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(recurrenceId)
    || !Number.isInteger(recurrenceIndex) || !Number.isInteger(recurrenceMonths)
    || recurrenceIndex! < 1 || recurrenceIndex! > recurrenceMonths!) {
    throw new Error('Os dados da recorrência estão incompletos ou inválidos.');
  }
  validateRecurrenceMonths(recurrenceMonths!);
  return { recurrenceId, recurrenceIndex, recurrenceMonths };
}

type MonthlyItem = RecurrenceFields & { id: string; date: string; month: string; createdAt: number };

export function createMonthlyOccurrences<T extends { date: string; month: string; value: number }>(
  draft: T, months: number, prefix: 'exp' | 'rev',
  getMonth: (date: string) => string = date => date.slice(0, 7),
): (T & MonthlyItem)[] {
  validateRecurrenceMonths(months);
  if (!Number.isFinite(draft.value) || draft.value <= 0) throw new Error('Informe um valor mensal maior que zero.');
  const recurrenceId = `rec-${crypto.randomUUID()}`;
  const createdAt = Date.now();
  return Array.from({ length: months }, (_, index) => {
    const date = shiftMonthlyDate(draft.date, index);
    return { ...draft, id: `${prefix}-${recurrenceId}-${index + 1}`, date, month: getMonth(date),
      recurrenceId, recurrenceIndex: index + 1, recurrenceMonths: months, createdAt };
  });
}

export function selectRecurringItems<T extends MonthlyItem>(items: T[], pivot: T, scope: RecurrenceScope): T[] {
  return items.filter(item => item.id === pivot.id || (scope === 'future' && !!pivot.recurrenceId
    && item.recurrenceId === pivot.recurrenceId && item.recurrenceIndex! >= pivot.recurrenceIndex!));
}

export function updateRecurringItems<T extends MonthlyItem>(
  items: T[], pivot: T, changes: Partial<T>, scope: RecurrenceScope,
  getMonth: (date: string) => string = date => date.slice(0, 7),
): T[] {
  const selected = new Set(selectRecurringItems(items, pivot, scope).map(item => item.id));
  return items.filter(item => selected.has(item.id)).map(item => {
    const dateChanged = changes.date !== undefined && changes.date !== pivot.date;
    const offset = scope === 'future' ? item.recurrenceIndex! - pivot.recurrenceIndex! : 0;
    const date = dateChanged ? shiftMonthlyDate(changes.date!, offset) : item.date;
    return { ...item, ...changes, id: item.id, createdAt: item.createdAt,
      recurrenceId: item.recurrenceId, recurrenceIndex: item.recurrenceIndex, recurrenceMonths: item.recurrenceMonths,
      date, month: dateChanged ? getMonth(date) : item.month };
  });
}
