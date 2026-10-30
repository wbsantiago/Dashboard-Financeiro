import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryBudget, Expense } from '../types';
import { formatCurrency } from '../utils/format';

interface ChartProps { expenses: Expense[]; selectedMonth: string; }

export const ChartsView: React.FC<ChartProps & { categoryBudgets: CategoryBudget[]; onEditLimits: () => void }> = ({ expenses, categoryBudgets, selectedMonth, onEditLimits }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const rows = useMemo(() => {
    const values = new Map<string, { spent: number; limit: number }>();
    categoryBudgets.forEach(b => values.set(b.category, { spent: 0, limit: b.idealLimit }));
    expenses.filter(e => e.month === selectedMonth).forEach(e => {
      const row = values.get(e.category) || { spent: 0, limit: 0 };
      row.spent += e.value;
      values.set(e.category, row);
    });
    return [...values].map(([category, values]) => ({ category, ...values })).sort((a, b) => b.spent - a.spent);
  }, [expenses, categoryBudgets, selectedMonth]);
  const max = Math.max(1, ...rows.flatMap(r => [r.spent, r.limit]));
  const active = rows.find(r => r.category === activeCategory);
  return <section className="sereno-panel sereno-comparison" aria-labelledby="comparison-title">
    <div className="sereno-section-heading"><h2 id="comparison-title">Gastos e limites</h2><button type="button" className="sereno-link" onClick={onEditLimits}>Ajustar limites</button></div>
    <div className="sereno-bar-key"><span><i />Gasto lançado</span><span><i />Limite planejado</span></div>
    <div className="sereno-category-bars">
      {rows.map(row => <button type="button" className="sereno-bar-row" key={row.category} onMouseEnter={() => setActiveCategory(row.category)} onMouseLeave={() => setActiveCategory(null)} onFocus={() => setActiveCategory(row.category)} onBlur={() => setActiveCategory(null)} onClick={() => setActiveCategory(row.category)} aria-label={`${row.category}: consultar gasto e limite`}>
        <span>{row.category}</span><span className="sereno-bar-pair"><i style={{ width: `${row.spent / max * 100}%` }} /><i style={{ width: `${row.limit / max * 100}%` }} /></span>
        <span className={row.limit > 0 && row.spent > row.limit ? 'sereno-danger-text' : ''}>{row.limit > 0 ? `${Math.round(row.spent / row.limit * 100)}%` : 'Sem limite'}</span>
      </button>)}
    </div>
    <p className="sereno-chart-note" aria-live="polite">{active ? <>{active.category}: <span className="privacy-blur">{formatCurrency(active.spent)}</span> de <span className="privacy-blur">{formatCurrency(active.limit)}</span> planejados.</> : 'Passe o mouse ou toque para ver o gasto e o limite de cada categoria.'}</p>
  </section>;
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export function SpendingHistory({ expenses, selectedMonth }: ChartProps) {
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [active, setActive] = useState<number | null>(null);
  const year = selectedMonth.slice(0, 4);
  const data = useMemo(() => MONTHS.map((name, i) => ({ name, value: expenses.filter(e => e.month === `${year}-${String(i + 1).padStart(2, '0')}`).reduce((sum, e) => sum + e.value, 0) })), [expenses, year]);
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setActive(null), [selectedMonth]);
  const left = width < 420 ? 42 : 58, right = 17, top = 20, bottom = 157;
  const max = Math.max(1, ...data.map(d => d.value));
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const ceiling = Math.ceil(max / magnitude) * magnitude;
  const point = (i: number) => ({ x: left + i * (width - left - right) / 11, y: bottom - data[i].value / ceiling * (bottom - top) });
  const selected = active === null ? null : { ...point(active), ...data[active] };
  const showNearest = (clientX: number) => {
    const rect = plot.current?.getBoundingClientRect();
    if (rect) setActive(Math.max(0, Math.min(11, Math.round((clientX - rect.left - left) / (width - left - right) * 11))));
  };
  return <section className="sereno-panel sereno-history" aria-labelledby="history-title">
    <div className="sereno-section-heading"><div><h2 id="history-title">Histórico de gastos no ano</h2><p>Total de despesas lançado em cada mês de {year}</p></div><span>{year}</span></div>
    <div ref={plot} className="sereno-history-plot" tabIndex={0} role="group" aria-label="Gastos mensais. Use as setas para consultar os valores." onPointerMove={e => { if (e.pointerType === 'mouse') showNearest(e.clientX); }} onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null); }} onClick={e => showNearest(e.clientX)} onBlur={() => setActive(null)} onKeyDown={e => {
      if (e.key === 'Escape') setActive(null);
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        setActive(current => e.key === 'Home' ? 0 : e.key === 'End' ? 11 : current === null ? (e.key === 'ArrowRight' ? 0 : 11) : Math.max(0, Math.min(11, current + (e.key === 'ArrowRight' ? 1 : -1))));
      }
    }}>
      <svg viewBox={`0 0 ${width} 190`} width="100%" height="190" aria-hidden="true">
        <text x="2" y="12" className="sereno-axis-label">R$</text>
        {[0, .5, 1].map(f => <g key={f}><line x1={left} x2={width - right} y1={bottom - f * (bottom - top)} y2={bottom - f * (bottom - top)} className="sereno-grid-line" /><text x={left - 8} y={bottom - f * (bottom - top) + 4} textAnchor="end" className="sereno-axis-label privacy-axis-value">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(ceiling * f)}</text></g>)}
        <polyline points={data.map((_, i) => `${point(i).x},${point(i).y}`).join(' ')} className="sereno-history-line" />
        {data.map((d, i) => <text key={d.name} x={point(i).x} y="181" textAnchor="middle" className="sereno-axis-label">{width < 400 && i % 2 === 1 && i !== 11 ? '' : d.name}</text>)}
        {selected && <g><line x1={selected.x} x2={selected.x} y1={selected.y} y2={bottom} className="sereno-history-guide" /><circle cx={selected.x} cy={selected.y} r="4" className="sereno-history-dot" /></g>}
      </svg>
      {selected && <div className="sereno-history-tooltip" role="status" style={{ left: Math.max(0, Math.min(width - 150, selected.x - 75)), top: selected.y >= 55 ? selected.y - 49 : selected.y + 14 }}><span className="privacy-blur">{formatCurrency(selected.value)}</span></div>}
    </div>
    <p className="sereno-chart-note">Passe o mouse ou toque em um mês para ver o valor no gráfico.</p>
  </section>;
}
