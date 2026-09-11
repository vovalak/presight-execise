import {
  ORDERS,
  SORT_FIELDS,
  SORT_LABELS,
  type Order,
  type SortField,
} from '../state/searchParams';
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from './Icons';

interface Props {
  sort: SortField;
  order: Order;
  onSortChange: (sort: SortField) => void;
  onOrderChange: (order: Order) => void;
}

const ORDER_LABELS: Record<Order, string> = { asc: 'Ascending', desc: 'Descending' };

export function SortControls({ sort, order, onSortChange, onOrderChange }: Props) {
  const nextOrder: Order = order === 'asc' ? 'desc' : 'asc';
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="sort-field" className="text-sm text-slate-500">
        Sort
      </label>
      <div className="relative">
        <select
          id="sort-field"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortField)}
          className="appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pr-8 pl-2.5 text-sm shadow-sm focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
        >
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {SORT_LABELS[field]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-500" />
      </div>
      <div
        className="flex overflow-hidden rounded-lg border border-slate-300 shadow-sm"
        role="group"
        aria-label="Sort direction"
      >
        {ORDERS.map((candidate) => {
          const active = candidate === order;
          const Icon = candidate === 'asc' ? ArrowUpIcon : ArrowDownIcon;
          return (
            <button
              key={candidate}
              type="button"
              aria-pressed={active}
              aria-label={ORDER_LABELS[candidate]}
              title={ORDER_LABELS[candidate]}
              onClick={() => onOrderChange(active ? nextOrder : candidate)}
              className={`flex items-center px-2 py-1.5 text-sm ${
                active ? 'bg-accent text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
