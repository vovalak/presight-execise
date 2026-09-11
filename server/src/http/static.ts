import path from 'node:path';
import express, { type Express } from 'express';

export function serveClient(app: Express, staticDir: string): void {
  const indexFile = path.join(staticDir, 'index.html');

  app.use(
    '/assets',
    express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y', index: false }),
  );
  app.use(express.static(staticDir, { index: false }));

  app.use((req, res, next) => {
    const navigation = (req.method === 'GET' || req.method === 'HEAD') && req.accepts('html');
    if (!navigation || req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(indexFile, { headers: { 'Cache-Control': 'no-cache' } }, (error) => {
      if (error) next(error);
    });
  });
}
