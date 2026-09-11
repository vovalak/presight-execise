export const SORT_FIELDS = ['first_name', 'last_name', 'age', 'nationality'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const ORDERS = ['asc', 'desc'] as const;
export type Order = (typeof ORDERS)[number];

export const DEFAULT_SORT: SortField = 'first_name';
export const DEFAULT_ORDER: Order = 'asc';
export const DEFAULT_LIMIT = 30;
export const MAX_LIMIT = 100;
export const FACET_LIMIT = 20;

export interface Filters {
  q: string;
  hobbies: string[];
  nationalities: string[];
}

export interface ListParams extends Filters {
  sort: SortField;
  order: Order;
  limit: number;
  cursor: string | undefined;
}

export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  /** Derived from `date_of_birth` per request. */
  age: number;
  nationality: string;
  hobbies: string[];
}

export type UserRow = Omit<User, 'age' | 'hobbies'>;

export interface PageInfo {
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
}

export interface UsersPage {
  items: User[];
  pageInfo: PageInfo;
}

export interface Facet {
  value: string;
  count: number;
}

export interface Facets {
  hobbies: Facet[];
  nationalities: Facet[];
}
