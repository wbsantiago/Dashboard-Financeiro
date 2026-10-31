import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { CardFilterOption } from '../utils/expenseFilters';

interface Props {
  revenues: boolean;
  expanded: boolean;
  onToggle: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  method: string;
  onMethodChange: (value: string) => void;
  card: string;
  cards: CardFilterOption[];
  onCardChange: (value: string) => void;
  status: 'all' | 'paid' | 'unpaid';
  onStatusChange: (value: 'all' | 'paid' | 'unpaid') => void;
  onClear: () => void;
}

export function EntryFilters(p: Props) {
  const count = Number(p.category !== 'all') + (p.revenues ? 0 : Number(p.method !== 'all') + Number(p.card !== 'all') + Number(p.status !== 'all'));
  return <div className="entry-filter-controls">
    <div className="entry-search-row">
      <label className="sr-only" htmlFor="entry-search">Pesquisar lançamento</label>
      <input id="entry-search" type="search" placeholder="Pesquisar lançamento" value={p.search} onChange={e => p.onSearchChange(e.target.value)} />
      <button type="button" className="sereno-secondary" onClick={p.onToggle} aria-expanded={p.expanded} aria-controls="entry-filters">
        <SlidersHorizontal size={16} />Filtros{count > 0 && <span className="entry-filter-count">{count}</span>}
      </button>
      <button type="button" className="sereno-link entry-clear-filters" onClick={p.onClear}>Limpar</button>
    </div>
    <div className="entry-filter-grid" id="entry-filters" hidden={!p.expanded}>
      <div className="entry-filter-field"><label htmlFor="entry-filter-category">Categoria</label><select id="entry-filter-category" value={p.category} onChange={e => p.onCategoryChange(e.target.value)}>
        <option value="all">Todas as categorias</option>
        {p.categories.map(category => <option key={category} value={category}>{category}</option>)}
      </select></div>
      {!p.revenues && <>
        <div className="entry-filter-field"><label htmlFor="entry-filter-method">Forma de pagamento</label><select id="entry-filter-method" value={p.method} onChange={e => p.onMethodChange(e.target.value)}>
          <option value="all">Todas as formas</option><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="card">Cartão</option>
        </select></div>
        <div className="entry-filter-field"><label htmlFor="entry-filter-card">Cartão</label><select id="entry-filter-card" value={p.card} onChange={e => p.onCardChange(e.target.value)}>
          <option value="all">Todos os cartões</option>
          {p.cards.map(card => <option key={card.value} value={card.value}>{card.label}</option>)}
        </select></div>
        <div className="entry-filter-field"><label htmlFor="entry-filter-status">Situação</label><select id="entry-filter-status" value={p.status} onChange={e => p.onStatusChange(e.target.value as Props['status'])}>
          <option value="all">Pagos e pendentes</option><option value="paid">Pagos</option><option value="unpaid">Pendentes</option>
        </select></div>
      </>}
    </div>
  </div>;
}
