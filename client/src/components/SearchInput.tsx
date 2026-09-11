import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { CloseIcon, SearchIcon } from './Icons';

interface Props {
  value: string;
  onChange: (query: string) => void;
}

const DEBOUNCE_MS = 250;

export function SearchInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef(value);
  const commit = useDebouncedCallback((query: string) => {
    lastCommitted.current = query;
    onChange(query);
  }, DEBOUNCE_MS);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      commit.cancel();
      setDraft(value);
    }
  }, [value, commit]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    commit.call(event.target.value.trim());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit.flush(draft.trim());
    if (event.key === 'Escape' && draft) {
      setDraft('');
      commit.flush('');
    }
  };

  const clear = () => {
    setDraft('');
    commit.flush('');
  };

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        aria-label="Search by first or last name"
        placeholder="Search by first or last name"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-9 pl-9 text-sm shadow-sm placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
