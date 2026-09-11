import type { Db } from '../db/connection.js';
import { HOBBIES } from './data.js';
import { generateUsers, type SeedUser } from './generate.js';

export interface SeedOptions {
  count: number;
  seed: number;
  today?: string | undefined;
}

export interface SeedSummary {
  users: number;
  hobbies: number;
  links: number;
}

export function countUsers(db: Db): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}

export function clearDatabase(db: Db): void {
  db.exec('DELETE FROM user_hobbies; DELETE FROM users; DELETE FROM hobbies;');
}

export function insertUsers(db: Db, users: readonly SeedUser[]): SeedSummary {
  const insertHobby = db.prepare('INSERT INTO hobbies (name) VALUES (?)');
  const insertUser = db.prepare(
    'INSERT INTO users (avatar, first_name, last_name, date_of_birth, nationality) VALUES (?, ?, ?, ?, ?)',
  );
  const insertLink = db.prepare('INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)');

  const run = db.transaction((): SeedSummary => {
    const hobbyIds = new Map<string, number>();
    const knownHobbies = new Set<string>([...HOBBIES, ...users.flatMap((u) => u.hobbies)]);
    for (const name of knownHobbies) {
      const result = insertHobby.run(name);
      hobbyIds.set(name, Number(result.lastInsertRowid));
    }

    let links = 0;
    for (const user of users) {
      const result = insertUser.run(
        user.avatar,
        user.first_name,
        user.last_name,
        user.date_of_birth,
        user.nationality,
      );
      const userId = Number(result.lastInsertRowid);
      for (const hobby of user.hobbies) {
        const hobbyId = hobbyIds.get(hobby);
        if (hobbyId === undefined) throw new Error(`Unknown hobby "${hobby}"`);
        insertLink.run(userId, hobbyId);
        links++;
      }
    }
    return { users: users.length, hobbies: hobbyIds.size, links };
  });

  return run();
}

export function seedDatabase(db: Db, options: SeedOptions): SeedSummary {
  const users = generateUsers(options.count, options.seed, options.today);
  const run = db.transaction(() => {
    clearDatabase(db);
    return insertUsers(db, users);
  });
  const summary = run();
  // Refresh planner statistics so filtered facet and page queries pick good plans.
  db.exec('ANALYZE');
  return summary;
}
