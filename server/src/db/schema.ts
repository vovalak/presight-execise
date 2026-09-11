import type { Db } from './connection.js';

/**
 * Text columns that are searched, filtered, or sorted are declared `COLLATE NOCASE`
 * so that ORDER BY, the keyset row-value comparison, and the composite indexes all
 * agree on case-insensitive ordering. Each `(column, id)` index backs one sort
 * option with `id` as the deterministic tie-breaker. `date_of_birth` is an ISO date, so it
 * sorts chronologically as text; `age` is derived from it per request.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  avatar        TEXT    NOT NULL,
  first_name    TEXT    NOT NULL COLLATE NOCASE,
  last_name     TEXT    NOT NULL COLLATE NOCASE,
  date_of_birth TEXT    NOT NULL CHECK (
    date_of_birth GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND date_of_birth IS date(date_of_birth)
  ),
  nationality   TEXT    NOT NULL COLLATE NOCASE
);

CREATE INDEX IF NOT EXISTS ix_users_first_name    ON users (first_name, id);
CREATE INDEX IF NOT EXISTS ix_users_last_name     ON users (last_name, id);
CREATE INDEX IF NOT EXISTS ix_users_date_of_birth ON users (date_of_birth, id);
CREATE INDEX IF NOT EXISTS ix_users_nationality   ON users (nationality, id);

CREATE TABLE IF NOT EXISTS hobbies (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS user_hobbies (
  user_id  INTEGER NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
  hobby_id INTEGER NOT NULL REFERENCES hobbies (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, hobby_id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS ix_user_hobbies_hobby ON user_hobbies (hobby_id, user_id);
`;

export function applySchema(db: Db): void {
  db.exec(SCHEMA_SQL);
}
