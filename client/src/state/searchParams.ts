export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const ORDERS = ['asc', 'desc'] as const;
export type Order = (typeof ORDERS)[number];

export const SORT_LABELS: Record<SortField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  age: 'Age',
  nationality: 'Nationality',
};

export interface FilterState {
  q: string;
  hobbies: string[];
  nationalities: string[];
}

export interface ViewState extends FilterState {
  sort: SortField;
  order: Order;
}

export const DEFAULT_STATE: ViewState = {
  q: '',
  hobbies: [],
  nationalities: [],
  sort: 'first_name',
  order: 'asc',
};

const PARAM = {
  q: 'q',
  hobby: 'hobby',
  nationality: 'nationality',
  sort: 'sort',
  order: 'order',
} as const;

function isSortField(value: string | null): value is SortField {
  return SORT_FIELDS.includes(value as SortField);
}

function isOrder(value: string | null): value is Order {
  return ORDERS.includes(value as Order);
}

export function normalizeList(values: readonly string[]): string[] {
  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return [...new Set(cleaned)].sort((a, b) => a.localeCompare(b));
}

export function parseViewState(params: URLSearchParams): ViewState {
  const sort = params.get(PARAM.sort);
  const order = params.get(PARAM.order);
  return {
    q: (params.get(PARAM.q) ?? '').trim(),
    hobbies: normalizeList(params.getAll(PARAM.hobby)),
    nationalities: normalizeList(params.getAll(PARAM.nationality)),
    sort: isSortField(sort) ? sort : DEFAULT_STATE.sort,
    order: isOrder(order) ? order : DEFAULT_STATE.order,
  };
}

export function serializeViewState(state: ViewState): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set(PARAM.q, q);
  for (const hobby of normalizeList(state.hobbies)) params.append(PARAM.hobby, hobby);
  for (const nationality of normalizeList(state.nationalities))
    params.append(PARAM.nationality, nationality);
  if (state.sort !== DEFAULT_STATE.sort) params.set(PARAM.sort, state.sort);
  if (state.order !== DEFAULT_STATE.order) params.set(PARAM.order, state.order);
  return params;
}

export function viewStateKey(state: ViewState): string {
  return serializeViewState(state).toString();
}

export function filterState(state: ViewState): ViewState {
  return {
    ...DEFAULT_STATE,
    q: state.q,
    hobbies: state.hobbies,
    nationalities: state.nationalities,
  };
}

export function hasActiveFilters(state: FilterState): boolean {
  return state.q.trim().length > 0 || state.hobbies.length > 0 || state.nationalities.length > 0;
}

export function activeFilterCount(state: FilterState): number {
  return (state.q.trim() ? 1 : 0) + state.hobbies.length + state.nationalities.length;
}

export function toggleValue(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
