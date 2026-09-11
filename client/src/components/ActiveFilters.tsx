import { hasActiveFilters, type ViewState } from '../state/searchParams';
import { CloseIcon, Spinner } from './Icons';

interface Props {
  state: ViewState;
  total: number | undefined;
  isUpdating: boolean;
  onRemoveHobby: (value: string) => void;
  onRemoveNationality: (value: string) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

interface ChipProps {
  label: string;
  tone: 'search' | 'hobby' | 'nationality';
  onRemove: () => void;
}

const TONES: Record<ChipProps['tone'], string> = {
  search: 'border-slate-300 bg-white text-slate-700',
  hobby: 'border-accent/30 bg-accent-soft text-accent',
  nationality: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

function Chip({ label, tone, onRemove }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`group inline-flex max-w-60 items-center gap-1 rounded-full border py-0.5 pr-1.5 pl-2.5 text-xs font-medium ${TONES[tone]}`}
    >
      <span className="truncate">{label}</span>
      <CloseIcon className="size-3.5 opacity-60 group-hover:opacity-100" />
      <span className="sr-only">Remove filter</span>
    </button>
  );
}

export function ActiveFilters({
  state,
  total,
  isUpdating,
  onRemoveHobby,
  onRemoveNationality,
  onClearSearch,
  onClearAll,
}: Props) {
  const active = hasActiveFilters(state);
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
      <p aria-live="polite" className="flex items-center gap-2 font-medium text-slate-700">
        {total === undefined
          ? 'Loading people…'
          : `${total.toLocaleString()} ${total === 1 ? 'person' : 'people'}`}
        {isUpdating && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
            <Spinner className="size-3" />
            Updating
          </span>
        )}
      </p>
      {state.q && <Chip label={`“${state.q}”`} tone="search" onRemove={onClearSearch} />}
      {state.hobbies.map((hobby) => (
        <Chip key={`h-${hobby}`} label={hobby} tone="hobby" onRemove={() => onRemoveHobby(hobby)} />
      ))}
      {state.nationalities.map((nationality) => (
        <Chip
          key={`n-${nationality}`}
          label={nationality}
          tone="nationality"
          onRemove={() => onRemoveNationality(nationality)}
        />
      ))}
      {active && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-xs font-medium text-accent hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
