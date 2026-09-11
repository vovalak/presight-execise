import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { DEFAULT_STATE, parseViewState, serializeViewState, type ViewState } from './searchParams';

export interface UpdateOptions {
  replace?: boolean;
}

export interface ViewStateApi {
  state: ViewState;
  update: (patch: Partial<ViewState>, options?: UpdateOptions) => void;
  clearFilters: () => void;
}

/**
 * View state lives in the URL. `update` reads the live `window.location` rather than a
 * value captured at render time, so several updates in one tick (e.g. a debounced search
 * flush racing a facet click) compose instead of overwriting each other.
 */
export function useViewState(): ViewStateApi {
  const location = useLocation();
  const navigate = useNavigate();

  const state = useMemo(
    () => parseViewState(new URLSearchParams(location.search)),
    [location.search],
  );

  const update = useCallback(
    (patch: Partial<ViewState>, options?: UpdateOptions) => {
      const current = parseViewState(new URLSearchParams(window.location.search));
      const next = serializeViewState({ ...current, ...patch }).toString();
      if (next === serializeViewState(current).toString()) return;
      void navigate(
        { pathname: '/', search: next ? `?${next}` : '' },
        { replace: options?.replace ?? false },
      );
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    update({
      q: DEFAULT_STATE.q,
      hobbies: DEFAULT_STATE.hobbies,
      nationalities: DEFAULT_STATE.nationalities,
    });
  }, [update]);

  return { state, update, clearFilters };
}
