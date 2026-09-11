export interface User {
  id: number;
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age: number;
  nationality: string;
  hobbies: string[];
}

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

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
