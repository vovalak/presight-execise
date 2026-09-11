import { describe, expect, it } from 'vitest';
import {
  addDays,
  addYearsClamped,
  ageAt,
  birthDateWindow,
  daysBetween,
  isIsoDate,
  isoDate,
} from '../dates.js';

describe('ageAt', () => {
  it('counts completed years', () => {
    expect(ageAt('1996-09-14', '2026-09-14')).toBe(30);
    expect(ageAt('1996-09-15', '2026-09-14')).toBe(29);
    expect(ageAt('1996-09-13', '2026-09-14')).toBe(30);
    expect(ageAt('2000-12-31', '2026-01-01')).toBe(25);
    expect(ageAt('2026-09-14', '2026-09-14')).toBe(0);
  });

  it('moves a 29 February birthday to 1 March in non-leap years', () => {
    expect(ageAt('2008-02-29', '2027-02-28')).toBe(18);
    expect(ageAt('2008-02-29', '2027-03-01')).toBe(19);
    expect(ageAt('2008-02-29', '2028-02-28')).toBe(19);
    expect(ageAt('2008-02-29', '2028-02-29')).toBe(20);
  });
});

describe('isoDate and isIsoDate', () => {
  it('formats the UTC calendar date', () => {
    expect(isoDate(new Date('2026-09-14T23:30:00-05:00'))).toBe('2026-09-15');
    expect(isoDate(new Date('2026-09-14T00:00:00Z'))).toBe('2026-09-14');
  });

  it('accepts only real, zero-padded calendar dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-09-14')).toBe(true);
    const rejected = [
      '2027-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-1-1',
      '2026-09-14T00:00',
      '',
      42,
      undefined,
      null,
    ];
    for (const value of rejected) expect(isIsoDate(value)).toBe(false);
  });
});

describe('date arithmetic', () => {
  it('adds days and measures distances in UTC', () => {
    expect(addDays('2010-03-01', -1)).toBe('2010-02-28');
    expect(addDays('2008-02-28', 1)).toBe('2008-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2009-03-01', '2010-02-28')).toBe(364);
    expect(daysBetween('2007-03-01', '2008-02-29')).toBe(365);
  });

  it('clamps 29 February when adding years', () => {
    expect(addYearsClamped('2028-02-29', -20)).toBe('2008-02-29');
    expect(addYearsClamped('2028-02-29', -18)).toBe('2010-02-28');
    expect(addYearsClamped('2026-09-14', -44)).toBe('1982-09-14');
  });

  it('computes the inclusive window of birth dates for an age', () => {
    const cases: [today: string, age: number, earliest: string, latest: string][] = [
      ['2028-02-29', 18, '2009-03-01', '2010-02-28'],
      ['2028-02-29', 20, '2007-03-01', '2008-02-29'],
      ['2027-03-01', 19, '2007-03-02', '2008-03-01'],
      ['2027-02-28', 19, '2007-03-01', '2008-02-28'],
      ['2026-09-14', 44, '1981-09-15', '1982-09-14'],
    ];
    for (const [today, age, earliest, latest] of cases) {
      expect(birthDateWindow(today, age)).toEqual({ earliest, latest });
      expect(ageAt(earliest, today)).toBe(age);
      expect(ageAt(latest, today)).toBe(age);
      expect(ageAt(addDays(earliest, -1), today)).toBe(age + 1);
      expect(ageAt(addDays(latest, 1), today)).toBe(age - 1);
      expect([365, 366]).toContain(daysBetween(earliest, latest) + 1);
    }
  });
});
