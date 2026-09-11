import { createApp, hasClientBuild } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/connection.js';
import { applySchema } from './db/schema.js';
import { countUsers } from './seed/seed.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
applySchema(db);

const users = countUsers(db);
if (users === 0) {
  console.warn(
    `Database ${config.databasePath} has no users yet. Run \`yarn seed\` to populate it.`,
  );
}

const app = createApp({ db, staticDir: config.staticDir });
const server = app.listen(config.port, () => {
  const client = hasClientBuild(config.staticDir)
    ? `serving ${config.staticDir}`
    : 'not built (API only)';
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Database: ${config.databasePath} (${users} users). Client: ${client}.`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down.`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
