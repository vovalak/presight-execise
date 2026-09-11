import { describe, expect, it } from 'vitest';
import { MEMORY_DB, openDatabase } from '../db/connection.js';
import { applySchema } from '../db/schema.js';

describe('users schema', () => {
  it('rejects birth dates that are not real calendar dates', () => {
    const db = openDatabase(MEMORY_DB);
    applySchema(db);
    const insert = db.prepare(
      `INSERT INTO users (avatar, first_name, last_name, date_of_birth, nationality)
       VALUES ('x', 'a', 'b', ?, 'c')`,
    );
    expect(() => insert.run('2010-02-30')).toThrow(/CHECK/);
    expect(() => insert.run('2010-2-9')).toThrow(/CHECK/);
    expect(() => insert.run('2010-02-28T00:00')).toThrow(/CHECK/);
    expect(insert.run('2008-02-29').changes).toBe(1);
    db.close();
  });
});
