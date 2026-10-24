import React from 'react';
import { formatCurrency, formatMonthName } from '../utils/format';
import { MAX_RECURRENCE_MONTHS, shiftMonthlyDate } from '../utils/recurrence';
import type { RecurrenceScope } from '../types';

export type EntryType = 'single' | 'installment' | 'monthly';

interface Props {
  entryType: EntryType;
  onTypeChange: (type: EntryType) => void;
  months: string;
  onMonthsChange: (months: string) => void;
  date: string;
  value: string;
  allowInstallments?: boolean;
  getMonth?: (date: string) => string;
}

export function RecurrenceControls({ entryType, onTypeChange, months, onMonthsChange, date, value,
  allowInstallments = false, getMonth = date => date.slice(0, 7) }: Props) {
  const options: { type: EntryType; label: string }[] = [
    { type: 'single', label: 'Único' },
    ...(allowInstallments ? [{ type: 'installment' as const, label: 'Parcelado' }] : []),
    { type: 'monthly', label: 'Recorrente mensal' },
  ];
  const count = Number(months);
  const validCount = Number.isInteger(count) && count >= 1 && count <= MAX_RECURRENCE_MONTHS;
  let summary = '';
  try {
    if (validCount && Number(value) > 0) {
      const lastDate = shiftMonthlyDate(date, count - 1);
      summary = `${count} lançamento${count === 1 ? '' : 's'} de ${formatCurrency(Number(value))}, de ${formatMonthName(getMonth(date))} a ${formatMonthName(getMonth(lastDate))}.`;
    }
  } catch { /* Wait for a complete, valid date before showing the preview. */ }
  const untilDecember = /^\d{4}-\d{2}-\d{2}$/.test(date) ? 13 - Number(date.slice(5, 7)) : 0;

  return (
    <fieldset className="space-y-2 rounded-xl border border-white/10 bg-zinc-950/20 p-3">
      <legend className="px-1 text-[10px] font-bold text-slate-350">Tipo de lançamento</legend>
      <div className={`grid gap-1.5 ${allowInstallments ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {options.map(option => (
          <button key={option.type} type="button" aria-pressed={entryType === option.type}
            onClick={() => onTypeChange(option.type)}
            className={`rounded-lg border px-1.5 py-2 text-[10px] font-bold cursor-pointer transition-colors ${entryType === option.type
              ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-300'
              : 'border-white/10 bg-zinc-900/40 text-slate-400 hover:border-white/25'}`}>
            {option.label}
          </button>
        ))}
      </div>
      {entryType === 'monthly' && (
        <div className="space-y-2 pt-1">
          <label className="block text-[11px] text-slate-300">
            Repetir por quantos meses?
            <input type="number" min="1" max={MAX_RECURRENCE_MONTHS} step="1" required
              value={months} onChange={event => onMonthsChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-400" />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[3, 6, 12].map(count => (
              <button type="button" key={count} onClick={() => onMonthsChange(String(count))}
                className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10 cursor-pointer">{count} meses</button>
            ))}
            {untilDecember > 0 && untilDecember <= 12 && (
              <button type="button" onClick={() => onMonthsChange(String(untilDecember))}
                className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10 cursor-pointer">Até dezembro</button>
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400">Inclui o primeiro mês. O valor inteiro se repete a cada mês, por até {MAX_RECURRENCE_MONTHS} meses.</p>
          {summary && <p role="status" className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-[11px] leading-relaxed text-indigo-200 privacy-blur">{summary}</p>}
        </div>
      )}
    </fieldset>
  );
}

export function RecurrenceScopeSelector({ value, onChange }: {
  value: RecurrenceScope; onChange: (value: RecurrenceScope) => void;
}) {
  return (
    <label className="block space-y-1.5 text-[11px] text-slate-300">
      <span>Aplicar a quais lançamentos?</span>
      <select value={value} onChange={event => onChange(event.target.value as RecurrenceScope)}
        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
        <option value="single">Somente este mês</option>
        <option value="future">Este mês e os próximos</option>
      </select>
      <span className="block text-[10px] text-slate-400">Os lançamentos anteriores desta série serão preservados.</span>
    </label>
  );
}
