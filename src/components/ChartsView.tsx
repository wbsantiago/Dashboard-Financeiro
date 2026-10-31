import { PrivateValue } from './PrivateValue';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Curve } from 'recharts';
import { CategoryBudget, Expense } from '../types';
import { categoryBudgetUsage } from '../utils/categories';
import { formatCurrency } from '../utils/format';
import { useChartEntrance } from '../hooks/useChartEntrance';

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
  const active = rows.find(r => r.category === activeCategory);
  const entrance = useChartEntrance(rows.some(row => row.spent > 0));
  return <section className="sereno-panel sereno-comparison" aria-labelledby="comparison-title">
    <div className="sereno-section-heading"><div><h2 id="comparison-title">Gastos e limites</h2><p>Quanto do limite de cada categoria já foi usado</p></div><button type="button" className="sereno-link" onClick={onEditLimits}>Ajustar limites</button></div>
    <div className="sereno-bar-key"><span><i />Gasto do limite</span><span><i />Limite da categoria (100%)</span></div>
    <div className="category-usage-chart">
      <div className="category-usage-axis" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
      <div className="category-usage-scroll" role="region" aria-label="Comparativo por categoria" tabIndex={0}>
        <div className="category-usage-columns" data-chart-entering={entrance.isEntering || undefined} onAnimationEnd={entrance.finish} style={{ gridTemplateColumns: 'repeat(' + rows.length + ', minmax(var(--category-column-min), 1fr))' }}>
          {rows.map(row => {
            const usage = categoryBudgetUsage(row.spent, row.limit);
            return <button type="button" key={row.category} className="category-usage-column" data-category={row.category} data-exceeded={usage.exceeded || undefined}
              onMouseEnter={() => setActiveCategory(row.category)} onMouseLeave={() => setActiveCategory(null)} onFocus={() => setActiveCategory(row.category)} onBlur={() => setActiveCategory(null)} onClick={() => setActiveCategory(row.category)}
              aria-label={row.category + ': ' + (usage.percentage === null ? 'sem limite definido' : Math.round(usage.percentage) + '% do limite')}>
              <span className="category-usage-percent" data-no-limit={usage.percentage === null || undefined}>{usage.percentage === null ? 'Sem limite' : Math.round(usage.percentage) + '%'}</span>
              <span className="category-usage-track" data-no-limit={usage.percentage === null || undefined}>
                {usage.fillPercentage !== null && <i className="category-usage-fill" style={{ height: usage.fillPercentage + '%' }} />}
                {usage.percentage === null && <span className="category-no-limit-mark" aria-hidden="true">—</span>}
              </span>
              <span className="category-usage-label"><span className="category-usage-name">{row.category}</span></span>
            </button>;
          })}
        </div>
      </div>
    </div>
    <p className="sereno-chart-note" aria-live="polite">{active && <><strong>{active.category}</strong>: <PrivateValue className="privacy-value">{formatCurrency(active.spent)}</PrivateValue>{active.limit > 0 ? <> de <PrivateValue className="privacy-value">{formatCurrency(active.limit)}</PrivateValue> planejados{active.spent > active.limit ? ' · Acima do limite.' : '.'}</> : ' · Sem limite definido.'}</>}</p>
    <p className="category-usage-explanation">Cada coluna preenche até 100% do próprio limite. Acima disso, o percentual completo aparece em destaque.</p>
  </section>;
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export function SpendingHistory({ expenses, selectedMonth }: ChartProps) {
  const plot = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  const [width, setWidth] = useState(800);
  const [active, setActive] = useState<number | null>(null);
  const year = selectedMonth.slice(0, 4);
  const data = useMemo(() => MONTHS.map((name, i) => ({ name, value: expenses.filter(e => e.month === `${year}-${String(i + 1).padStart(2, '0')}`).reduce((sum, e) => sum + e.value, 0) })), [expenses, year]);
  const entrance = useChartEntrance(data.some(month => month.value > 0));
  const revealId = useId();
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setActive(null), [selectedMonth]);
  const height = 280;
  const left = width < 420 ? 42 : 58, right = 17, top = 44, bottom = height - 38;
  const max = Math.max(1, ...data.map(d => d.value));
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const ceiling = Math.ceil(max * 1.18 / magnitude) * magnitude;
  const step = Math.max(1, width - left - right) / data.length;
  const point = (i: number) => ({ x: left + (i + .5) * step, y: bottom - data[i].value / ceiling * (bottom - top) });
  const points = data.map((_, i) => point(i));
  const selected = active === null ? null : { ...point(active), ...data[active] };
  const showNearest = (clientX: number) => {
    const rect = plot.current?.getBoundingClientRect();
    if (rect) setActive(Math.max(0, Math.min(11, Math.floor((clientX - rect.left - left) / step))));
  };
  return <section className="sereno-panel sereno-history" aria-labelledby="history-title">
    <div className="sereno-section-heading"><div><h2 id="history-title">Histórico de gastos no ano</h2><p>Total de despesas lançado em cada mês de {year}</p></div><span>{year}</span></div>
    <div className="sereno-history-key"><i aria-hidden="true" />Despesas mensais</div>
    <div ref={plot} className="sereno-history-plot" tabIndex={0} role="group" aria-label="Gastos mensais. Use as setas para consultar os valores." onPointerMove={e => { if (e.pointerType === 'mouse') showNearest(e.clientX); }} onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null); }} onClick={e => showNearest(e.clientX)} onBlur={() => setActive(null)} onKeyDown={e => {
      if (e.key === 'Escape') setActive(null);
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        setActive(current => e.key === 'Home' ? 0 : e.key === 'End' ? 11 : current === null ? (e.key === 'ArrowRight' ? 0 : 11) : Math.max(0, Math.min(11, current + (e.key === 'ArrowRight' ? 1 : -1))));
      }
    }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} aria-hidden="true" data-chart-entering={entrance.isEntering || undefined}>
        <defs><clipPath id={revealId}><rect className="sereno-history-reveal" width={width} height={height} onAnimationEnd={entrance.finish} /></clipPath><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sereno-bar)" stopOpacity=".42" />
          <stop offset="100%" stopColor="var(--sereno-bar)" stopOpacity=".025" />
        </linearGradient></defs>
        <text x="2" y="12" className="sereno-axis-label">R$</text>
        {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1={left} x2={width - right} y1={bottom - f * (bottom - top)} y2={bottom - f * (bottom - top)} className="sereno-grid-line" /><text x={left - 8} y={bottom - f * (bottom - top) + 4} textAnchor="end" className="sereno-axis-label privacy-axis-value">{new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(ceiling * f)}</text></g>)}
        <g clipPath={`url(#${revealId})`}>
          <Curve type="monotoneX" points={points} baseLine={bottom} fill={`url(#${gradientId})`} stroke="none" />
          <Curve type="monotoneX" points={points} className="sereno-history-line" />
          {points.map((p, i) => <circle key={data[i].name} cx={p.x} cy={p.y} r="3.5" className="sereno-history-month-dot" />)}
        </g>
        {data.map((d, i) => <text key={d.name} x={point(i).x} y={height - 12} textAnchor="middle" className="sereno-axis-label">{width < 360 ? ([0, 3, 7, 11].includes(i) ? d.name : '') : width < 550 && i % 2 === 1 && i !== 11 ? '' : d.name}</text>)}
        {selected && <g><line x1={selected.x} x2={selected.x} y1={top} y2={bottom} className="sereno-history-guide" /><circle cx={selected.x} cy={selected.y} r="6" className="sereno-history-dot" /></g>}
      </svg>
      {selected && <div className="sereno-history-tooltip" role="status" style={{ left: Math.max(0, Math.min(width - 150, selected.x - 75)), top: Math.max(4, selected.y - 49) }}><PrivateValue as="span" className="privacy-value">{formatCurrency(selected.value)}</PrivateValue></div>}
    </div>
    <p className="sereno-chart-note">Passe o mouse ou toque em um mês para ver o valor no gráfico.</p>
  </section>;
}
