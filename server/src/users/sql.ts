import type { Cursor } from './cursor.js';
import {
  FACET_LIMIT,
  type Filters,
  type ListParams,
  type Order,
  type SortField,
  type UserRow,
} from './types.js';

export interface Query {
  sql: string;
  params: unknown[];
}

export type SortColumn = Exclude<keyof UserRow, 'id' | 'avatar'>;

interface SortKey {
  column: SortColumn;
  inverted: boolean;
}

export const SORT_KEYS: Record<SortField, SortKey> = {
  first_name: { column: 'first_name', inverted: false },
  last_name: { column: 'last_name', inverted: false },
  // Age is derived from the birth date, so "youngest first" means latest date first.
  age: { column: 'date_of_birth', inverted: true },
  nationality: { column: 'nationality', inverted: false },
};

export function scanAscending(sort: SortField, order: Order): boolean {
  return (order === 'asc') !== SORT_KEYS[sort].inverted;
}

const MAX_TOKENS = 5;

export function tokenize(q: string): string[] {
  return q.split(/\s+/).filter(Boolean).slice(0, MAX_TOKENS);
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

export interface WhereOptions {
  // Nationality facet ignores the nationality filter so a second one (OR) can be added.
  includeNationality: boolean;
}

export function buildFilterWhere(
  filters: Filters,
  options: WhereOptions = { includeNationality: true },
): Query {
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const token of tokenize(filters.q)) {
    const pattern = `%${escapeLike(token)}%`;
    clauses.push(`(u.first_name LIKE ? ESCAPE '\\' OR u.last_name LIKE ? ESCAPE '\\')`);
    params.push(pattern, pattern);
  }

  if (options.includeNationality && filters.nationalities.length > 0) {
    clauses.push(`u.nationality IN (${placeholders(filters.nationalities.length)})`);
    params.push(...filters.nationalities);
  }

  // AND semantics: one EXISTS per selected hobby. An unknown hobby matches nobody.
  for (const hobby of filters.hobbies) {
    clauses.push(
      `EXISTS (SELECT 1 FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id
               WHERE uh.user_id = u.id AND h.name = ?)`,
    );
    params.push(hobby);
  }

  return { sql: clauses.length > 0 ? clauses.join(' AND ') : '1 = 1', params };
}

// Keyset pagination: `(column, id)` is a strict total order, so the row-value comparison
// resumes exactly after the cursor. Fetches `limit + 1` to detect a next page.
export function buildListQuery(params: ListParams, cursor: Cursor | null): Query {
  const column = `u.${SORT_KEYS[params.sort].column}`;
  const ascending = scanAscending(params.sort, params.order);
  const direction = ascending ? 'ASC' : 'DESC';
  const where = buildFilterWhere(params);
  const clauses = [where.sql];
  const values: unknown[] = [...where.params];

  if (cursor) {
    clauses.push(`(${column}, u.id) ${ascending ? '>' : '<'} (?, ?)`);
    values.push(cursor.value, cursor.id);
  }
  values.push(params.limit + 1);

  return {
    sql: `SELECT u.id, u.avatar, u.first_name, u.last_name, u.date_of_birth, u.nationality
          FROM users u
          WHERE ${clauses.join(' AND ')}
          ORDER BY ${column} ${direction}, u.id ${direction}
          LIMIT ?`,
    params: values,
  };
}

export function buildCountQuery(filters: Filters): Query {
  const where = buildFilterWhere(filters);
  return { sql: `SELECT COUNT(*) AS total FROM users u WHERE ${where.sql}`, params: where.params };
}

export function buildHobbyFacetQuery(filters: Filters): Query {
  const where = buildFilterWhere(filters);
  return {
    sql: `WITH matched AS (SELECT u.id FROM users u WHERE ${where.sql})
          SELECT h.name AS value, COUNT(*) AS count
          FROM matched m
          JOIN user_hobbies uh ON uh.user_id = m.id
          JOIN hobbies h ON h.id = uh.hobby_id
          GROUP BY h.id
          ORDER BY count DESC, h.name ASC
          LIMIT ${FACET_LIMIT}`,
    params: where.params,
  };
}

export function buildNationalityFacetQuery(filters: Filters): Query {
  const where = buildFilterWhere(filters, { includeNationality: false });
  return {
    sql: `SELECT u.nationality AS value, COUNT(*) AS count
          FROM users u
          WHERE ${where.sql}
          GROUP BY u.nationality
          ORDER BY count DESC, value ASC
          LIMIT ${FACET_LIMIT}`,
    params: where.params,
  };
}

export function buildHobbiesForUsersQuery(userIds: readonly number[]): Query {
  return {
    sql: `SELECT uh.user_id AS user_id, h.name AS name
          FROM user_hobbies uh
          JOIN hobbies h ON h.id = uh.hobby_id
          WHERE uh.user_id IN (${placeholders(userIds.length)})
          ORDER BY uh.user_id, h.name`,
    params: [...userIds],
  };
}
