import type { Order, SortField, ViewState } from '../state/searchParams';
import { FilterIcon, UsersIcon } from './Icons';
import { SearchInput } from './SearchInput';
import { SortControls } from './SortControls';

interface Props {
  state: ViewState;
  filterCount: number;
  onSearch: (query: string) => void;
  onSortChange: (sort: SortField) => void;
  onOrderChange: (order: Order) => void;
  onOpenFilters: () => void;
}

export function Header({
  state,
  filterCount,
  onSearch,
  onSortChange,
  onOrderChange,
  onOpenFilters,
}: Props) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
            <UsersIcon className="size-4" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight">People Directory</h1>
        </div>

        <div className="order-last w-full md:order-none md:w-auto md:max-w-md md:flex-1">
          <SearchInput value={state.q} onChange={onSearch} />
        </div>

        <SortControls
          sort={state.sort}
          order={state.order}
          onSortChange={onSortChange}
          onOrderChange={onOrderChange}
        />

        <button
          type="button"
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm hover:bg-slate-50 md:hidden"
        >
          <FilterIcon className="size-4" />
          Filters
          {filterCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
