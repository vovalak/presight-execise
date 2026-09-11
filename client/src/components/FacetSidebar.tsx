import type { FacetsQuery } from '../hooks/useFacetsQuery';
import { hasActiveFilters, type ViewState } from '../state/searchParams';
import { FacetList } from './FacetList';

interface Props {
  state: ViewState;
  facets: FacetsQuery;
  onToggleHobby: (value: string) => void;
  onToggleNationality: (value: string) => void;
  onClearFilters: () => void;
}

export function FacetSidebar({
  state,
  facets,
  onToggleHobby,
  onToggleNationality,
  onClearFilters,
}: Props) {
  const retry = () => void facets.refetch();
  const common = {
    isLoading: facets.isPending,
    isUpdating: facets.isPlaceholderData || (facets.isFetching && !facets.isPending),
    error: facets.error,
    onRetry: retry,
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-slate-500">Top 20 for the current results</p>
        {hasActiveFilters(state) && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <FacetList
        title="Hobbies"
        hint="match all"
        facets={facets.data?.hobbies}
        selected={state.hobbies}
        onToggle={onToggleHobby}
        {...common}
      />
      <FacetList
        title="Nationalities"
        hint="match any"
        facets={facets.data?.nationalities}
        selected={state.nationalities}
        onToggle={onToggleNationality}
        {...common}
      />
    </div>
  );
}
