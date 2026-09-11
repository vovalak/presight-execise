import { ageAt } from '../dates.js';
import type { Db } from '../db/connection.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import {
  SORT_KEYS,
  buildCountQuery,
  buildHobbiesForUsersQuery,
  buildHobbyFacetQuery,
  buildListQuery,
  buildNationalityFacetQuery,
} from './sql.js';
import type { Facet, Facets, Filters, ListParams, User, UserRow, UsersPage } from './types.js';

export function toUsers(db: Db, rows: readonly UserRow[], today: string): User[] {
  const hobbiesByUser = new Map<number, string[]>();
  if (rows.length > 0) {
    const query = buildHobbiesForUsersQuery(rows.map((row) => row.id));
    const links = db.prepare(query.sql).all(...query.params) as { user_id: number; name: string }[];
    for (const link of links) {
      const list = hobbiesByUser.get(link.user_id);
      if (list) list.push(link.name);
      else hobbiesByUser.set(link.user_id, [link.name]);
    }
  }
  return rows.map((row) => ({
    ...row,
    age: ageAt(row.date_of_birth, today),
    hobbies: hobbiesByUser.get(row.id) ?? [],
  }));
}

export function countUsers(db: Db, filters: Filters): number {
  const query = buildCountQuery(filters);
  const row = db.prepare(query.sql).get(...query.params) as { total: number };
  return row.total;
}

export function listUsers(db: Db, params: ListParams, today: string): UsersPage {
  const cursor = params.cursor ? decodeCursor(params.cursor, params.sort, params.order) : null;
  const query = buildListQuery(params, cursor);
  const rows = db.prepare(query.sql).all(...query.params) as UserRow[];

  const hasMore = rows.length > params.limit;
  const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          sort: params.sort,
          order: params.order,
          value: last[SORT_KEYS[params.sort].column],
          id: last.id,
        })
      : null;

  return {
    items: toUsers(db, pageRows, today),
    pageInfo: { hasMore, nextCursor, total: countUsers(db, params) },
  };
}

export function getFacets(db: Db, filters: Filters): Facets {
  const hobbies = buildHobbyFacetQuery(filters);
  const nationalities = buildNationalityFacetQuery(filters);
  return {
    hobbies: db.prepare(hobbies.sql).all(...hobbies.params) as Facet[],
    nationalities: db.prepare(nationalities.sql).all(...nationalities.params) as Facet[],
  };
}
