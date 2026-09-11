import { describe, expect, it } from 'vitest';
import { HttpError } from '../http/errors.js';
import { parseFacetParams, parseListParams } from '../users/params.js';

function expectBadRequest(fn: () => unknown, field: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    const httpError = error as HttpError;
    expect(httpError.status).toBe(400);
    expect(httpError.code).toBe('BAD_REQUEST');
    const details = httpError.details as { fieldErrors: Record<string, string[]> };
    expect(Object.keys(details.fieldErrors)).toContain(field);
    return;
  }
  throw new Error('expected a 400 HttpError');
}

describe('parseListParams', () => {
  it('applies defaults for an empty query', () => {
    expect(parseListParams({})).toEqual({
      q: '',
      hobbies: [],
      nationalities: [],
      sort: 'first_name',
      order: 'asc',
      limit: 30,
      cursor: undefined,
    });
  });

  it('normalises single values and arrays for multi-value params', () => {
    expect(parseListParams({ hobby: 'Chess' }).hobbies).toEqual(['Chess']);
    expect(parseListParams({ hobby: ['Chess', 'Reading'] }).hobbies).toEqual(['Chess', 'Reading']);
    expect(
      parseListParams({ nationality: ['French', ' French ', '', 'Swiss', 'French'] }).nationalities,
    ).toEqual(['French', 'Swiss']);
  });

  it('trims the text filter and keeps the first value when repeated', () => {
    expect(parseListParams({ q: '  ann  ' }).q).toBe('ann');
    expect(parseListParams({ q: ['first', 'second'] }).q).toBe('first');
    expect(parseListParams({ q: '' }).q).toBe('');
  });

  it('coerces and bounds limit', () => {
    expect(parseListParams({ limit: '10' }).limit).toBe(10);
    expect(parseListParams({ limit: '' }).limit).toBe(30);
    expectBadRequest(() => parseListParams({ limit: '0' }), 'limit');
    expectBadRequest(() => parseListParams({ limit: '101' }), 'limit');
    expectBadRequest(() => parseListParams({ limit: 'abc' }), 'limit');
    expectBadRequest(() => parseListParams({ limit: '2.5' }), 'limit');
  });

  it('rejects unknown sort fields and orders', () => {
    expect(parseListParams({ sort: 'age', order: 'desc' })).toMatchObject({
      sort: 'age',
      order: 'desc',
    });
    expectBadRequest(() => parseListParams({ sort: 'id' }), 'sort');
    expectBadRequest(() => parseListParams({ sort: 'avatar' }), 'sort');
    expectBadRequest(() => parseListParams({ order: 'up' }), 'order');
  });

  it('rejects too many or too long values', () => {
    const many = Array.from({ length: 21 }, (_, i) => `h${i}`);
    expectBadRequest(() => parseListParams({ hobby: many }), 'hobby');
    expectBadRequest(() => parseListParams({ q: 'x'.repeat(101) }), 'q');
  });

  it('treats an empty cursor as absent', () => {
    expect(parseListParams({ cursor: '' }).cursor).toBeUndefined();
    expect(parseListParams({ cursor: 'abc' }).cursor).toBe('abc');
  });
});

describe('parseFacetParams', () => {
  it('returns only filter fields', () => {
    expect(
      parseFacetParams({ q: 'a', hobby: 'Chess', nationality: ['X', 'Y'], sort: 'whatever' }),
    ).toEqual({
      q: 'a',
      hobbies: ['Chess'],
      nationalities: ['X', 'Y'],
    });
  });
});
