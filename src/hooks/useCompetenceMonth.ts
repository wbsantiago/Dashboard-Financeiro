import { useEffect, useState } from 'react';
import type { MonthlyBudget } from '../types';
import { getCompetenceMonth } from '../utils/format';

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Follow the closing date until the user deliberately browses another month. */
export function useCompetenceMonth(budgets: MonthlyBudget[], defaultClosingDay = 5, fixedMonth?: string) {
  const [today, setToday] = useState(localToday);
  const [manualMonth, setManualMonth] = useState<string | null>(null);
  const currentMonth = fixedMonth ?? getCompetenceMonth(today, budgets, defaultClosingDay);

  useEffect(() => {
    if (fixedMonth) return;
    const refresh = () => setToday(localToday());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fixedMonth]);

  const selectMonth = (month: string) => setManualMonth(month === currentMonth ? null : month);
  return [manualMonth ?? currentMonth, selectMonth, {
    currentMonth,
    calendarMonth: fixedMonth ?? today.substring(0, 7),
    followCurrentMonth: () => setManualMonth(null),
  }] as const;
}
