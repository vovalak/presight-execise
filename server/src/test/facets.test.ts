import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../db/connection.js';
import { countUsers, getFacets } from '../users/service.js';
import type { Facet, Filters } from '../users/types.js';
import {
  EMPTY_FILTERS,
  createTestDb,
  foldFacets,
  loadAll,
  oracleFacet,
  oracleFilter,
  type OracleUser,
} from './fixture.js';

let db: Db;
let all: OracleUser[];

beforeAll(() => {
  db = createTestDb();
  all = loadAll(db);
});
afterAll(() => db.close());

function expectedHobbies(filters: Filters): Facet[] {
  return oracleFacet(oracleFilter(all, filters).flatMap((u) => u.hobbies));
}

function expectedNationalities(filters: Filters): Facet[] {
  return oracleFacet(
    oracleFilter(all, { ...filters, nationalities: [] }).map((u) => u.nationality),
  );
}

function expectFacets(filters: Filters): ReturnType<typeof getFacets> {
  const facets = getFacets(db, filters);
  expect(foldFacets(facets.hobbies)).toEqual(foldFacets(expectedHobbies(filters)));
  expect(foldFacets(facets.nationalities)).toEqual(foldFacets(expectedNationalities(filters)));
  expect(facets.hobbies.length).toBeLessThanOrEqual(20);
  expect(facets.nationalities.length).toBeLessThanOrEqual(20);
  return facets;
}

describe('facets', () => {
  it('returns the global top 20 when nothing is filtered', () => {
    const facets = expectFacets(EMPTY_FILTERS);
    expect(facets.hobbies).toHaveLength(20);
    expect(facets.nationalities).toHaveLength(20);
    for (const list of [facets.hobbies, facets.nationalities]) {
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1]!;
        const next = list[i]!;
        expect(prev.count >= next.count).toBe(true);
        if (prev.count === next.count)
          expect(prev.value.toLowerCase() < next.value.toLowerCase()).toBe(true);
      }
    }
  });

  it('reflects the text filter in both lists', () => {
    expectFacets({ ...EMPTY_FILTERS, q: 'an' });
    expectFacets({ ...EMPTY_FILTERS, q: 'zeta' });
  });

  it('reflects selected hobbies in both lists (selected hobby count equals total)', () => {
    const filters = { ...EMPTY_FILTERS, hobbies: ['Chess'] };
    const facets = expectFacets(filters);
    expect(facets.hobbies.find((f) => f.value === 'Chess')?.count).toBe(countUsers(db, filters));
    expectFacets({ ...EMPTY_FILTERS, hobbies: ['Chess', 'Reading'] });
  });

  it('applies the nationality filter to hobbies but not to the nationality list', () => {
    const filters = { ...EMPTY_FILTERS, nationalities: ['Testlandic'] };
    const facets = expectFacets(filters);
    expect(foldFacets(facets.hobbies)).toEqual([
      { value: 'chess', count: 4 },
      { value: 'reading', count: 3 },
      { value: 'cooking', count: 1 },
    ]);
    expect(facets.nationalities).toEqual(getFacets(db, EMPTY_FILTERS).nationalities);
  });

  it('combines text, hobby, and nationality filters', () => {
    expectFacets({ q: 'a', hobbies: ['Reading'], nationalities: ['American', 'Indian'] });
    expectFacets({ q: 'zeta', hobbies: ['Chess'], nationalities: ['Testlandic'] });
  });

  it('is empty when nothing matches', () => {
    expect(getFacets(db, { ...EMPTY_FILTERS, hobbies: ['Nonexistent'] })).toEqual({
      hobbies: [],
      nationalities: [],
    });
    expect(getFacets(db, { ...EMPTY_FILTERS, q: 'zzzzzz' })).toEqual({
      hobbies: [],
      nationalities: [],
    });
  });
});
