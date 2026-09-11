import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ageAt, isIsoDate } from '../dates.js';
import { MEMORY_DB, openDatabase, type Db } from '../db/connection.js';
import { applySchema } from '../db/schema.js';
import { HOBBIES, MAX_AGE, MIN_AGE, NATIONALITIES } from '../seed/data.js';
import { generateUsers, AVATAR_PHOTO_COUNT, type SeedUser } from '../seed/generate.js';
import { countUsers, seedDatabase } from '../seed/seed.js';
import { TEST_TODAY, loadAll } from './fixture.js';

const T = TEST_TODAY;

describe('generateUsers', () => {
  it('is deterministic for a seed and day, and differs across seeds', () => {
    expect(generateUsers(200, 1, T)).toEqual(generateUsers(200, 1, T));
    expect(generateUsers(200, 1, T)).not.toEqual(generateUsers(200, 2, T));
    expect(generateUsers(0, 1, T)).toEqual([]);
    expect(() => generateUsers(1, 1, '2027-02-29')).toThrow(/YYYY-MM-DD/);
  });

  it('produces users within the documented ranges', () => {
    const users = generateUsers(2000, 3, T);
    expect(users).toHaveLength(2000);
    const counts = new Set<number>();
    const avatars = new Set<string>();
    for (const user of users) {
      avatars.add(user.avatar);
      expect(isIsoDate(user.date_of_birth)).toBe(true);
      const age = ageAt(user.date_of_birth, T);
      expect(age).toBeGreaterThanOrEqual(MIN_AGE);
      expect(age).toBeLessThanOrEqual(MAX_AGE);
      expect(NATIONALITIES).toContain(user.nationality);
      expect(user.hobbies.length).toBeLessThanOrEqual(10);
      expect(new Set(user.hobbies).size).toBe(user.hobbies.length);
      for (const hobby of user.hobbies) expect(HOBBIES).toContain(hobby);
      expect(user.avatar).toMatch(/^https:\/\/i\.pravatar\.cc\/150\?img=([1-9]|[1-6]\d|70)$/);
      counts.add(user.hobbies.length);
    }
    expect(counts.has(0)).toBe(true);
    expect(counts.has(10)).toBe(true);
    expect(avatars.size).toBe(AVATAR_PHOTO_COUNT);
  });

  it('pins the data set for a seed so the PRNG draw order cannot change unnoticed', () => {
    const summary = (users: SeedUser[]) =>
      users.map((u) => [
        u.first_name,
        u.last_name,
        ageAt(u.date_of_birth, T),
        u.nationality,
        u.hobbies,
      ]);
    expect(summary(generateUsers(3, 42, T))).toEqual([
      ['Maja', 'Li', 30, 'Vietnamese', ['Guitar', 'Photography', 'Singing', 'Kayaking', 'Writing']],
      ['Elijah', 'Vasquez', 32, 'Filipino', ['Dancing', 'Surfing']],
      [
        'Marco',
        'Abbas',
        21,
        'Spanish',
        ['Basketball', 'Reading', 'Running', 'Traveling', 'Gaming', 'Volunteering'],
      ],
    ]);
  });

  it('spreads birthdays over the year and keeps ages stable across leap-day todays', () => {
    const base = generateUsers(2000, 3, T);
    const monthDays = new Set(base.map((u) => u.date_of_birth.slice(5)));
    expect(monthDays.size).toBeGreaterThan(300);
    for (const today of ['2028-02-29', '2027-03-01', '2027-02-28', '2026-12-31']) {
      generateUsers(2000, 3, today).forEach((user, i) => {
        const { date_of_birth, ...rest } = user;
        const { date_of_birth: baseDate, ...baseRest } = base[i]!;
        expect(rest).toEqual(baseRest);
        expect(ageAt(date_of_birth, today)).toBe(ageAt(baseDate, T));
      });
    }
  });
});

describe('seedDatabase', () => {
  let db: Db;
  beforeEach(() => {
    db = openDatabase(MEMORY_DB);
    applySchema(db);
  });
  afterEach(() => db.close());

  it('replaces existing data and restarts ids from 1', () => {
    expect(seedDatabase(db, { count: 50, seed: 1, today: T })).toMatchObject({ users: 50 });
    const summary = seedDatabase(db, { count: 20, seed: 2, today: T });
    expect(summary.users).toBe(20);
    expect(countUsers(db)).toBe(20);
    const rows = loadAll(db);
    expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(summary.links).toBe(rows.reduce((sum, r) => sum + r.hobbies.length, 0));
  });

  it('stores exactly the generated data', () => {
    seedDatabase(db, { count: 30, seed: 9, today: T });
    const expected = generateUsers(30, 9, T);
    const rows = loadAll(db);
    rows.forEach((row, i) => {
      const user = expected[i]!;
      expect(row).toMatchObject({
        first_name: user.first_name,
        last_name: user.last_name,
        date_of_birth: user.date_of_birth,
        nationality: user.nationality,
      });
      expect([...row.hobbies].sort()).toEqual([...user.hobbies].sort());
    });
  });
});
