import { parseArgs } from 'node:util';
import { loadConfig } from '../config.js';
import { isIsoDate, isoDate } from '../dates.js';
import { openDatabase } from '../db/connection.js';
import { applySchema } from '../db/schema.js';
import { countUsers, seedDatabase } from './seed.js';

function main(): number {
  const { values } = parseArgs({
    options: {
      count: { type: 'string' },
      seed: { type: 'string' },
      today: { type: 'string' },
      database: { type: 'string' },
      'if-missing': { type: 'boolean', default: false },
    },
  });

  const config = loadConfig();
  const count = values.count === undefined ? config.seedCount : Number(values.count);
  const seed = values.seed === undefined ? config.seed : Number(values.seed);
  const today = values.today ?? isoDate(new Date());
  const databasePath = values.database ?? config.databasePath;

  if (!Number.isInteger(count) || count < 0) {
    console.error(`--count must be a non-negative integer, received "${values.count}"`);
    return 1;
  }
  if (!Number.isInteger(seed)) {
    console.error(`--seed must be an integer, received "${values.seed}"`);
    return 1;
  }
  if (!isIsoDate(today)) {
    console.error(`--today must be a calendar date (YYYY-MM-DD), received "${values.today}"`);
    return 1;
  }

  const db = openDatabase(databasePath);
  try {
    applySchema(db);
    const existing = countUsers(db);
    if (values['if-missing'] && existing > 0) {
      console.log(`Database ${databasePath} already has ${existing} users; skipping seed.`);
      return 0;
    }

    const startedAt = performance.now();
    const summary = seedDatabase(db, { count, seed, today });
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
    console.log(
      `Seeded ${databasePath}: ${summary.users} users, ${summary.hobbies} hobbies, ` +
        `${summary.links} user-hobby links in ${elapsed}s (seed=${seed}, today=${today}).`,
    );
    return 0;
  } finally {
    db.close();
  }
}

process.exitCode = main();
