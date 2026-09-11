import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ageAt } from '../dates.js';
import type { Db } from '../db/connection.js';
import { HttpError } from '../http/errors.js';
import { decodeCursor, encodeCursor } from '../users/cursor.js';
import { listUsers } from '../users/service.js';
import { ORDERS, SORT_FIELDS, type ListParams, type UsersPage } from '../users/types.js';
import {
  TEST_TODAY,
  createTestDb,
  loadAll,
  oracleFilter,
  oracleSort,
  type OracleUser,
} from './fixture.js';

let db: Db;
let all: OracleUser[];

beforeAll(() => {
  db = createTestDb();
  all = loadAll(db);
});
afterAll(() => db.close());

const BASE: ListParams = {
  q: '',
  hobbies: [],
  nationalities: [],
  sort: 'first_name',
  order: 'asc',
  limit: 30,
  cursor: undefined,
};

function list(overrides: Partial<ListParams>): UsersPage {
  return listUsers(db, { ...BASE, ...overrides }, TEST_TODAY);
}

const ids = (page: UsersPage): number[] => page.items.map((item) => item.id);

function walk(overrides: Partial<ListParams>): { ids: number[]; pages: UsersPage[] } {
  const pages: UsersPage[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 1000; i++) {
    const page = list({ ...overrides, cursor });
    pages.push(page);
    if (!page.pageInfo.hasMore) {
      expect(page.pageInfo.nextCursor).toBeNull();
      break;
    }
    expect(page.pageInfo.nextCursor).toEqual(expect.any(String));
    cursor = page.pageInfo.nextCursor as string;
  }
  return { ids: pages.flatMap(ids), pages };
}

function expectMatchesOracle(overrides: Partial<ListParams>): number[] {
  const params = { ...BASE, ...overrides };
  const expected = oracleSort(oracleFilter(all, params), params.sort, params.order).map(
    (u) => u.id,
  );
  const { ids: actual, pages } = walk(overrides);
  expect(actual).toEqual(expected);
  expect(new Set(actual).size).toBe(actual.length);
  for (const page of pages) expect(page.pageInfo.total).toBe(expected.length);
  expect(pages.length).toBe(Math.max(1, Math.ceil(expected.length / params.limit)));
  return actual;
}

const byName = (first: string, last: string): number =>
  all.find((u) => u.first_name === first && u.last_name === last)!.id;

describe('text filter', () => {
  it('matches substrings of first or last name, case-insensitively', () => {
    const found = expectMatchesOracle({ q: 'ann', limit: 10 });
    expect(found).toEqual(
      expect.arrayContaining([
        byName('anna', 'Zeta'),
        byName('Anna', 'Zeta'),
        byName('ANNA', 'zeta'),
      ]),
    );
    expect(walk({ q: 'ANN', limit: 10 }).ids).toEqual(found);
  });

  it('requires every whitespace-separated token to match either name', () => {
    const found = expectMatchesOracle({ q: 'anna zeta' });
    expect(found.sort()).toEqual(
      [byName('anna', 'Zeta'), byName('Anna', 'Zeta'), byName('ANNA', 'zeta')].sort(),
    );
    expect(walk({ q: 'zeta anna' }).ids.sort()).toEqual(found);
    expect(walk({ q: '   ' }).ids).toEqual(walk({ q: '' }).ids);
  });

  it('treats LIKE wildcards and quotes literally', () => {
    expect(ids(list({ q: '50%' }))).toEqual([byName('50%', 'Percent')]);
    expect(ids(list({ q: '%' }))).toEqual([byName('50%', 'Percent')]);
    expect(ids(list({ q: 'a_b' }))).toEqual([byName('a_b', 'Under')]);
    expect(ids(list({ q: '_' }))).toEqual([byName('a_b', 'Under')]);
    expect(ids(list({ q: "o'n" }))).toEqual([byName('Sean', "O'Neil")]);
    expectMatchesOracle({ q: '\\' });
  });
});

describe('nationality filter (OR)', () => {
  it('matches any selected nationality, case-insensitively', () => {
    expect(expectMatchesOracle({ nationalities: ['Testlandic'] })).toHaveLength(7);
    expect(walk({ nationalities: ['testlandic'] }).ids).toEqual(
      walk({ nationalities: ['Testlandic'] }).ids,
    );
    const union = expectMatchesOracle({ nationalities: ['Testlandic', 'Swedish'], limit: 7 });
    expect(union.length).toBeGreaterThan(7);
  });

  it('returns nothing for an unknown nationality', () => {
    const page = list({ nationalities: ['Atlantean'] });
    expect(page.items).toEqual([]);
    expect(page.pageInfo).toEqual({ hasMore: false, nextCursor: null, total: 0 });
  });
});

describe('hobby filter (AND)', () => {
  it('requires all selected hobbies', () => {
    const chess = expectMatchesOracle({ hobbies: ['Chess'], limit: 9 });
    const both = expectMatchesOracle({ hobbies: ['Chess', 'Reading'], limit: 9 });
    expect(both.length).toBeLessThan(chess.length);
    for (const id of both) expect(chess).toContain(id);
    expect(both).toEqual(expect.arrayContaining([byName('anna', 'Zeta'), byName('a_b', 'Under')]));
    expect(both).not.toContain(byName('Anna', 'Zeta'));
  });

  it('is case-insensitive and empty for unknown hobbies', () => {
    expect(walk({ hobbies: ['chess'] }).ids).toEqual(walk({ hobbies: ['Chess'] }).ids);
    const page = list({ hobbies: ['Chess', 'Nonexistent'] });
    expect(page.items).toEqual([]);
    expect(page.pageInfo).toEqual({ hasMore: false, nextCursor: null, total: 0 });
  });
});

describe('combined filters', () => {
  it('applies text, nationality, and hobby filters together', () => {
    const found = expectMatchesOracle({
      q: 'zeta',
      nationalities: ['Testlandic'],
      hobbies: ['Chess'],
    });
    expect(found.sort()).toEqual(
      [byName('anna', 'Zeta'), byName('Anna', 'Zeta'), byName('Sean', 'Zeta')].sort(),
    );
    expectMatchesOracle({
      q: 'a',
      nationalities: ['American', 'Indian'],
      hobbies: ['Reading'],
      limit: 4,
    });
  });
});

describe('sorting and keyset pagination', () => {
  for (const sort of SORT_FIELDS) {
    for (const order of ORDERS) {
      it(`walks every page in ${sort} ${order} order without gaps or duplicates`, () => {
        const found = expectMatchesOracle({ sort, order, limit: 7 });
        expect(found).toHaveLength(all.length);
      });

      it(`keeps the order stable under filters (${sort} ${order})`, () => {
        expectMatchesOracle({
          sort,
          order,
          limit: 5,
          nationalities: ['American', 'Indian', 'Testlandic'],
        });
        expectMatchesOracle({ sort, order, limit: 3, q: 'an' });
      });
    }
  }

  it('breaks ties between equal sort values by id in the scan direction', () => {
    const asc = walk({ sort: 'age', order: 'asc', limit: 50 }).ids;
    const desc = walk({ sort: 'age', order: 'desc', limit: 50 }).ids;
    expect(desc).toEqual([...asc].reverse());
    // Same birth date: the age asc scan runs date DESC, id DESC, so the higher id comes first.
    expect(walk({ q: 'anna zeta', sort: 'age', order: 'asc' }).ids).toEqual([
      byName('Anna', 'Zeta'),
      byName('anna', 'Zeta'),
      byName('ANNA', 'zeta'),
    ]);
    const zetas = walk({ q: 'zeta', sort: 'last_name', order: 'asc' }).ids;
    expect(zetas).toEqual([...zetas].sort((a, b) => a - b));
  });

  it('reports hasMore correctly at the boundaries', () => {
    const total = list({ nationalities: ['Testlandic'] }).pageInfo.total;
    expect(list({ nationalities: ['Testlandic'], limit: total }).pageInfo).toMatchObject({
      hasMore: false,
      nextCursor: null,
    });
    expect(list({ nationalities: ['Testlandic'], limit: total - 1 }).pageInfo).toMatchObject({
      hasMore: true,
    });
    expect(list({ nationalities: ['Testlandic'], limit: 100 }).pageInfo).toMatchObject({
      hasMore: false,
      nextCursor: null,
    });
  });

  it('derives age from date_of_birth as of the given day', () => {
    const page = list({ q: 'zeta' });
    expect(page.items.length).toBeGreaterThan(0);
    for (const item of page.items) expect(item.age).toBe(ageAt(item.date_of_birth, TEST_TODAY));
    expect(list({ q: 'sean zeta' }).items[0]).toMatchObject({
      date_of_birth: '1982-09-14',
      age: 44,
    });
    const eve = listUsers(db, { ...BASE, q: 'sean zeta' }, '2026-09-13');
    expect(eve.items[0]?.age).toBe(43);
  });

  it('returns each user with an alphabetically ordered hobby list', () => {
    const page = list({ q: 'a_b' });
    expect(page.items[0]).toMatchObject({
      first_name: 'a_b',
      last_name: 'Under',
      date_of_birth: '1982-03-12',
      age: 44,
      nationality: 'Testlandic',
      hobbies: ['Chess', 'Cooking', 'Reading'],
    });
    expect(page.items[0]?.avatar).toEqual(expect.any(String));
  });
});

describe('cursors', () => {
  const raw = (payload: unknown): string =>
    Buffer.from(JSON.stringify(payload)).toString('base64url');
  const expect400 = (fn: () => unknown, code = 'INVALID_CURSOR') => {
    try {
      fn();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).code).toBe(code);
      return;
    }
    throw new Error('expected an HttpError');
  };

  it('round-trips', () => {
    const encoded = encodeCursor({ sort: 'age', order: 'desc', value: '1982-03-12', id: 7 });
    expect(decodeCursor(encoded, 'age', 'desc')).toEqual({ value: '1982-03-12', id: 7 });
    const text = encodeCursor({ sort: 'last_name', order: 'asc', value: "O'Neil", id: 3 });
    expect(decodeCursor(text, 'last_name', 'asc')).toEqual({ value: "O'Neil", id: 3 });
  });

  it('rejects malformed, mismatched, or mistyped cursors', () => {
    const date = encodeCursor({ sort: 'age', order: 'asc', value: '1990-01-01', id: 1 });
    expect400(() => decodeCursor('not-base64-json', 'age', 'asc'));
    expect400(() => decodeCursor(raw('str'), 'age', 'asc'));
    expect400(() => decodeCursor(raw({ s: 'age', o: 'asc', v: '1990-01-01' }), 'age', 'asc'));
    expect400(() => decodeCursor(date, 'age', 'desc'));
    expect400(() => decodeCursor(date, 'last_name', 'asc'));
    expect400(() => decodeCursor(raw({ s: 'age', o: 'asc', v: 42, id: 1 }), 'age', 'asc'));
    expect400(() => decodeCursor(raw({ s: 'age', o: 'asc', v: 'x', id: 1 }), 'age', 'asc'));
    expect400(() =>
      decodeCursor(raw({ s: 'age', o: 'asc', v: '2027-02-29', id: 1 }), 'age', 'asc'),
    );
    expect400(() =>
      decodeCursor(raw({ s: 'first_name', o: 'asc', v: 1, id: 1 }), 'first_name', 'asc'),
    );
    expect400(() =>
      decodeCursor(
        encodeCursor({ sort: 'age', order: 'asc', value: '1990-01-01', id: 0 }),
        'age',
        'asc',
      ),
    );
    expect400(() => list({ cursor: 'garbage' }));
  });
});
