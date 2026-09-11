import path from 'node:path';

// `import.meta.dirname` is `server/src` under tsx and `server/dist` after `tsc`;
// one level up is the server package root either way.
const serverRoot = path.resolve(import.meta.dirname, '..');

export interface Config {
  port: number;
  databasePath: string;
  seedCount: number;
  seed: number;
  staticDir: string;
}

function intEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, received "${raw}"`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: intEnv(env, 'PORT', 3000),
    databasePath: path.resolve(
      serverRoot,
      env.DATABASE_PATH && env.DATABASE_PATH.trim() !== ''
        ? env.DATABASE_PATH
        : path.join('data', 'directory.db'),
    ),
    seedCount: intEnv(env, 'SEED_COUNT', 10_000),
    seed: intEnv(env, 'SEED', 42),
    staticDir: path.resolve(
      serverRoot,
      env.STATIC_DIR && env.STATIC_DIR.trim() !== ''
        ? env.STATIC_DIR
        : path.join('..', 'client', 'dist'),
    ),
  };
}
