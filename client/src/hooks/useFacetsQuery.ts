import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchFacets } from '../api/client';
import { filterState, viewStateKey, type ViewState } from '../state/searchParams';

export function useFacetsQuery(state: ViewState) {
  const filters = filterState(state);
  return useQuery({
    queryKey: ['facets', viewStateKey(filters)],
    queryFn: ({ signal }) => fetchFacets(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export type FacetsQuery = ReturnType<typeof useFacetsQuery>;
