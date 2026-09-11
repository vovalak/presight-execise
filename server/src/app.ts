import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import type { Db } from './db/connection.js';
import { errorHandler, notFoundApi } from './http/errors.js';
import { serveClient } from './http/static.js';
import { createUsersRouter } from './users/router.js';

export interface AppOptions {
  db: Db;
  staticDir?: string | undefined;
  now?: (() => Date) | undefined;
}

export function hasClientBuild(staticDir: string | undefined): staticDir is string {
  return staticDir !== undefined && fs.existsSync(path.join(staticDir, 'index.html'));
}

export function createApp({ db, staticDir, now = () => new Date() }: AppOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api', createUsersRouter(db, now));
  app.use('/api', notFoundApi);

  if (hasClientBuild(staticDir)) serveClient(app, staticDir);

  app.use(errorHandler);
  return app;
}
