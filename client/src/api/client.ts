import { filterState, serializeViewState, type ViewState } from '../state/searchParams';
import type { ApiErrorBody, Facets, UsersPage } from './types';

export const PAGE_SIZE = 30;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check that the API is running.');
  }

  if (!response.ok) {
    let code = `HTTP_${response.status}`;
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as Partial<ApiErrorBody>;
      if (body.error) {
        code = body.error.code;
        message = body.error.message;
      }
    } catch {}
    throw new ApiError(response.status, code, message);
  }

  return (await response.json()) as T;
}

export function fetchUsersPage(
  state: ViewState,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<UsersPage> {
  const params = serializeViewState(state);
  params.set('sort', state.sort);
  params.set('order', state.order);
  params.set('limit', String(PAGE_SIZE));
  if (cursor) params.set('cursor', cursor);
  return getJson<UsersPage>(`/api/users?${params}`, signal);
}

export function fetchFacets(state: ViewState, signal?: AbortSignal): Promise<Facets> {
  const params = serializeViewState(filterState(state));
  return getJson<Facets>(`/api/users/facets?${params}`, signal);
}
