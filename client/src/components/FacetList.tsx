import { useState } from 'react';
import type { Facet } from '../api/types';
import { AlertIcon, ChevronDownIcon } from './Icons';

interface Props {
  title: string;
  hint: string;
  facets: Facet[] | undefined;
  selected: string[];
  isLoading: boolean;
  isUpdating: boolean;
  error: Error | null;
  onToggle: (value: string) => void;
  onRetry: () => void;
}

interface Row {
  value: string;
  count: number | undefined;
  checked: boolean;
}

function buildRows(facets: Facet[] | undefined, selected: string[]): Row[] {
  const counts = new Map((facets ?? []).map((facet) => [facet.value.toLowerCase(), facet]));
  const selectedRows: Row[] = selected.map((value) => {
    const facet = counts.get(value.toLowerCase());
    return { value: facet?.value ?? value, count: facet?.count, checked: true };
  });
  const selectedKeys = new Set(selected.map((value) => value.toLowerCase()));
  const otherRows: Row[] = (facets ?? [])
    .filter((facet) => !selectedKeys.has(facet.value.toLowerCase()))
    .map((facet) => ({ value: facet.value, count: facet.count, checked: false }));
  return [...selectedRows, ...otherRows];
}

export function FacetList({
  title,
  hint,
  facets,
  selected,
  isLoading,
  isUpdating,
  error,
  onToggle,
  onRetry,
}: Props) {
  const [open, setOpen] = useState(true);
  const rows = buildRows(facets, selected);
  const id = `facet-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const panelId = `${id}-panel`;

  return (
    <section aria-labelledby={id} aria-busy={isLoading || isUpdating}>
      <div className="mb-2 flex items-center gap-2 px-2">
        <h2
          id={id}
          className="min-w-0 flex-1 text-sm font-semibold tracking-wide text-slate-700 uppercase"
        >
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            className="-ml-1 flex w-full items-center gap-1 rounded-md px-1 py-0.5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <ChevronDownIcon
              className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`}
            />
            <span className="truncate">{title}</span>
            {!open && selected.length > 0 && (
              <>
                <span
                  aria-hidden="true"
                  className="rounded-full bg-accent-soft px-1.5 text-xs font-medium tracking-normal text-accent normal-case tabular-nums"
                >
                  {selected.length}
                </span>
                <span className="sr-only">, {selected.length} selected</span>
              </>
            )}
          </button>
        </h2>
        <span className="shrink-0 text-xs text-slate-400">{hint}</span>
      </div>

      <div id={panelId} hidden={!open}>
        {isLoading ? (
          <ul className="space-y-1.5 px-2" aria-label={`Loading ${title.toLowerCase()}`}>
            {Array.from({ length: 8 }, (_, i) => (
              <li
                key={i}
                className="h-6 animate-pulse rounded bg-slate-200"
                style={{ width: `${90 - (i % 4) * 12}%` }}
              />
            ))}
          </ul>
        ) : error && !facets ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>Couldn't load {title.toLowerCase()}.</p>
              <button type="button" onClick={onRetry} className="mt-1 font-medium underline">
                Retry
              </button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-2 text-sm text-slate-400">
            No {title.toLowerCase()} in the current results.
          </p>
        ) : (
          <ul className={`space-y-0.5 transition-opacity ${isUpdating ? 'opacity-60' : ''}`}>
            {rows.map((row) => (
              <li key={row.value.toLowerCase()}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => onToggle(row.value)}
                    className="size-4 rounded border-slate-300 accent-accent"
                  />
                  <span
                    className={`min-w-0 flex-1 truncate ${row.checked ? 'font-medium text-slate-900' : 'text-slate-700'}`}
                  >
                    {row.value}
                  </span>
                  {row.count !== undefined && (
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {row.count.toLocaleString()}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
