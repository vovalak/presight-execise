import { MEMORY_DB, openDatabase, type Db } from '../db/connection.js';
import { applySchema } from '../db/schema.js';
import { generateUsers, type SeedUser } from '../seed/generate.js';
import { insertUsers } from '../seed/seed.js';
import type { Facet, Filters, Order, SortField } from '../users/types.js';

export const TEST_TODAY = '2026-09-14';
export const testNow = (): Date => new Date(`${TEST_TODAY}T12:00:00Z`);

export const EXTRA_USERS: SeedUser[] = [
  {
    avatar: 'x',
    first_name: 'anna',
    last_name: 'Zeta',
    date_of_birth: '1996-03-05',
    nationality: 'Testlandic',
    hobbies: ['Chess', 'Reading'],
  },
  {
    avatar: 'x',
    first_name: 'Anna',
    last_name: 'Zeta',
    date_of_birth: '1996-03-05',
    nationality: 'testlandic',
    hobbies: ['Chess'],
  },
  {
    avatar: 'x',
    first_name: 'ANNA',
    last_name: 'zeta',
    date_of_birth: '1995-11-20',
    nationality: 'Testlandic',
    hobbies: [],
  },
  {
    avatar: 'x',
    first_name: '50%',
    last_name: 'Percent',
    date_of_birth: '1981-09-15',
    nationality: 'Testlandic',
    hobbies: ['Reading'],
  },
  {
    avatar: 'x',
    first_name: 'a_b',
    last_name: 'Under',
    date_of_birth: '1982-03-12',
    nationality: 'Testlandic',
    hobbies: ['Chess', 'Reading', 'Cooking'],
  },
  {
    avatar: 'x',
    first_name: 'Sean',
    last_name: "O'Neil",
    date_of_birth: '1982-03-12',
    nationality: 'Testlandic',
    hobbies: [],
  },
  {
    avatar: 'x',
    first_name: 'Sean',
    last_name: 'Zeta',
    date_of_birth: '1982-09-14',
    nationality: 'Testlandic',
    hobbies: ['Chess'],
  },
];

export function createTestDb(options: { count?: number; seed?: number; today?: string } = {}): Db {
  const db = openDatabase(MEMORY_DB);
  applySchema(db);
  insertUsers(db, [
    ...generateUsers(options.count ?? 300, options.seed ?? 7, options.today ?? TEST_TODAY),
    ...EXTRA_USERS,
  ]);
  return db;
}

export interface OracleUser {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  hobbies: string[];
}

export function loadAll(db: Db): OracleUser[] {
  const rows = db
    .prepare('SELECT id, first_name, last_name, date_of_birth, nationality FROM users ORDER BY id')
    .all() as Omit<OracleUser, 'hobbies'>[];
  const links = db
    .prepare(
      'SELECT uh.user_id AS user_id, h.name AS name FROM user_hobbies uh JOIN hobbies h ON h.id = uh.hobby_id',
    )
    .all() as { user_id: number; name: string }[];
  const hobbies = new Map<number, string[]>();
  for (const link of links)
    hobbies.set(link.user_id, [...(hobbies.get(link.user_id) ?? []), link.name]);
  return rows.map((row) => ({ ...row, hobbies: hobbies.get(row.id) ?? [] }));
}

export const fold = (value: string): string => value.replace(/[A-Z]/g, (c) => c.toLowerCase());

export function nocaseCompare(a: string, b: string): number {
  const x = fold(a);
  const y = fold(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

const compare = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);

export const EMPTY_FILTERS: Filters = { q: '', hobbies: [], nationalities: [] };

export function oracleFilter(users: readonly OracleUser[], filters: Filters): OracleUser[] {
  const tokens = filters.q.split(/\s+/).filter(Boolean).slice(0, 5).map(fold);
  const nationalities = new Set(filters.nationalities.map(fold));
  const hobbies = filters.hobbies.map(fold);
  return users.filter(
    (user) =>
      tokens.every((t) => fold(user.first_name).includes(t) || fold(user.last_name).includes(t)) &&
      (nationalities.size === 0 || nationalities.has(fold(user.nationality))) &&
      hobbies.every((h) => user.hobbies.some((own) => fold(own) === h)),
  );
}

export function oracleSort(
  users: readonly OracleUser[],
  sort: SortField,
  order: Order,
): OracleUser[] {
  const direction = order === 'asc' ? 1 : -1;
  // sort=age walks the (date_of_birth, id) index in the opposite direction; id follows the scan.
  const scan = sort === 'age' ? -direction : direction;
  return [...users].sort((a, b) => {
    const byField =
      sort === 'age' ? compare(a.date_of_birth, b.date_of_birth) : nocaseCompare(a[sort], b[sort]);
    return (byField !== 0 ? byField : a.id - b.id) * scan;
  });
}

export function oracleFacet(values: readonly string[], limit = 20): Facet[] {
  const counts = new Map<string, Facet>();
  for (const value of values) {
    const key = fold(value);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || nocaseCompare(a.value, b.value))
    .slice(0, limit);
}

export function foldFacets(facets: readonly Facet[]): Facet[] {
  return facets.map((f) => ({ value: fold(f.value), count: f.count }));
}
