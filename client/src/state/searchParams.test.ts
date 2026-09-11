import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STATE,
  activeFilterCount,
  filterState,
  hasActiveFilters,
  parseViewState,
  serializeViewState,
  toggleValue,
  viewStateKey,
  type ViewState,
} from './searchParams';

const parse = (query: string) => parseViewState(new URLSearchParams(query));

describe('parseViewState', () => {
  it('returns defaults for an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_STATE);
  });

  it('reads every supported parameter', () => {
    expect(parse('q=ann&hobby=Chess&hobby=Reading&nationality=French&sort=age&order=desc')).toEqual(
      {
        q: 'ann',
        hobbies: ['Chess', 'Reading'],
        nationalities: ['French'],
        sort: 'age',
        order: 'desc',
      },
    );
  });

  it('normalises lists: trims, drops empties, de-duplicates, sorts', () => {
    const state = parse(
      'hobby=Reading&hobby=+Chess+&hobby=&hobby=Reading&nationality=b&nationality=a',
    );
    expect(state.hobbies).toEqual(['Chess', 'Reading']);
    expect(state.nationalities).toEqual(['a', 'b']);
  });

  it('trims the text filter', () => {
    expect(parse('q=+ann+').q).toBe('ann');
  });

  it('falls back to defaults for invalid sort and order', () => {
    expect(parse('sort=avatar&order=sideways')).toMatchObject({ sort: 'first_name', order: 'asc' });
    expect(parse('sort=&order=')).toMatchObject({ sort: 'first_name', order: 'asc' });
  });
});

describe('serializeViewState', () => {
  it('omits defaults entirely', () => {
    expect(serializeViewState(DEFAULT_STATE).toString()).toBe('');
    expect(serializeViewState({ ...DEFAULT_STATE, q: '   ' }).toString()).toBe('');
  });

  it('writes only non-default values in a stable order', () => {
    const state: ViewState = {
      q: 'ann',
      hobbies: ['Reading', 'Chess'],
      nationalities: ['French'],
      sort: 'age',
      order: 'desc',
    };
    expect(serializeViewState(state).toString()).toBe(
      'q=ann&hobby=Chess&hobby=Reading&nationality=French&sort=age&order=desc',
    );
    expect(viewStateKey({ ...state, hobbies: ['Chess', 'Reading', 'Chess'] })).toBe(
      viewStateKey(state),
    );
  });

  it('round-trips through parse', () => {
    const state: ViewState = {
      q: "o'neil 50%",
      hobbies: ['Board Games', 'Chess'],
      nationalities: ['South African'],
      sort: 'last_name',
      order: 'asc',
    };
    expect(parseViewState(serializeViewState(state))).toEqual(state);
  });
});

describe('helpers', () => {
  it('detects active filters and counts them', () => {
    expect(hasActiveFilters(DEFAULT_STATE)).toBe(false);
    const sortedOnly: ViewState = { ...DEFAULT_STATE, sort: 'age' };
    expect(hasActiveFilters(sortedOnly)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_STATE, q: 'x' })).toBe(true);
    expect(activeFilterCount({ q: 'x', hobbies: ['a', 'b'], nationalities: ['c'] })).toBe(4);
    expect(activeFilterCount(DEFAULT_STATE)).toBe(0);
  });

  it('strips sort information for facet queries', () => {
    expect(filterState({ ...DEFAULT_STATE, q: 'x', sort: 'age', order: 'desc' })).toEqual({
      ...DEFAULT_STATE,
      q: 'x',
    });
  });

  it('toggles values in and out of a list', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});
