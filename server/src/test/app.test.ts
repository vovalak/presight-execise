import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { Db } from '../db/connection.js';
import type { Facets, UsersPage } from '../users/types.js';
import { createTestDb, testNow } from './fixture.js';

let db: Db;
let staticDir: string;

beforeAll(() => {
  db = createTestDb({ count: 120 });
  staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'presight-client-'));
  fs.mkdirSync(path.join(staticDir, 'assets'));
  fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>spa</title>');
  fs.writeFileSync(path.join(staticDir, 'assets', 'app.js'), 'console.log(1)');
});

afterAll(() => {
  db.close();
  fs.rmSync(staticDir, { recursive: true, force: true });
});

const api = () => request(createApp({ db, now: testNow }));

describe('API', () => {
  it('reports health', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('lists users with pagination metadata', async () => {
    const res = await api().get('/api/users?limit=5');
    expect(res.status).toBe(200);
    const page = res.body as UsersPage;
    expect(page.items).toHaveLength(5);
    expect(page.pageInfo).toMatchObject({ hasMore: true, total: 127 });
    expect(page.pageInfo.nextCursor).toEqual(expect.any(String));
    expect(page.items[0]).toEqual({
      id: expect.any(Number),
      avatar: expect.any(String),
      first_name: expect.any(String),
      last_name: expect.any(String),
      date_of_birth: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      age: expect.any(Number),
      nationality: expect.any(String),
      hobbies: expect.any(Array),
    });
  });

  it('follows cursors without overlap', async () => {
    const first = (await api().get('/api/users?limit=50&sort=age&order=desc')).body as UsersPage;
    const params = new URLSearchParams({
      limit: '50',
      sort: 'age',
      order: 'desc',
      cursor: first.pageInfo.nextCursor!,
    });
    const second = (await api().get(`/api/users?${params}`)).body as UsersPage;
    const firstIds = first.items.map((u) => u.id);
    const secondIds = second.items.map((u) => u.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    expect(second.pageInfo.total).toBe(first.pageInfo.total);
    const lastOfFirst = first.items.at(-1)!;
    const firstOfSecond = second.items[0]!;
    expect(firstOfSecond.age <= lastOfFirst.age).toBe(true);
    expect(firstOfSecond.date_of_birth >= lastOfFirst.date_of_birth).toBe(true);
  });

  it('rejects a cursor whose value is not a date', async () => {
    const numeric = Buffer.from(JSON.stringify({ s: 'age', o: 'desc', v: 42, id: 7 })).toString(
      'base64url',
    );
    const res = await api().get(`/api/users?sort=age&order=desc&cursor=${numeric}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('derives ages from the injected clock', async () => {
    const today = (await api().get('/api/users?q=sean+zeta')).body as UsersPage;
    expect(today.items[0]).toMatchObject({ date_of_birth: '1982-09-14', age: 44 });
    const eve = createApp({ db, now: () => new Date('2026-09-13T23:59:59Z') });
    const yesterday = (await request(eve).get('/api/users?q=sean+zeta')).body as UsersPage;
    expect(yesterday.items[0]?.age).toBe(43);
  });

  it('accepts repeated filter params and combines them', async () => {
    const res = await api().get(
      '/api/users?q=zeta&nationality=Testlandic&nationality=Swedish&hobby=Chess&sort=last_name',
    );
    expect(res.status).toBe(200);
    const page = res.body as UsersPage;
    expect(page.pageInfo.total).toBe(3);
    for (const user of page.items) {
      expect(user.last_name.toLowerCase()).toContain('zeta');
      expect(user.hobbies).toContain('Chess');
    }
  });

  it('returns facets for the same filters', async () => {
    const res = await api().get('/api/users/facets?nationality=Testlandic');
    expect(res.status).toBe(200);
    const facets = res.body as Facets;
    expect(facets.hobbies[0]).toEqual({ value: 'Chess', count: 4 });
    expect(facets.nationalities.length).toBeGreaterThan(1);
  });

  it('rejects invalid parameters with a JSON 400', async () => {
    const res = await api().get('/api/users?sort=avatar&limit=0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(Object.keys(res.body.error.details.fieldErrors).sort()).toEqual(['limit', 'sort']);

    const cursor = await api().get('/api/users?cursor=nope');
    expect(cursor.status).toBe(400);
    expect(cursor.body.error.code).toBe('INVALID_CURSOR');
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('static client', () => {
  it('is not mounted without a build', async () => {
    const res = await api().get('/');
    expect(res.status).toBe(404);
  });

  it('serves index.html, assets, and deep links; keeps /api JSON', async () => {
    const app = request(createApp({ db, staticDir }));
    expect((await app.get('/')).text).toContain('spa');
    expect((await app.get('/assets/app.js')).headers['cache-control']).toContain('immutable');
    const deep = await app.get('/?q=ann&hobby=Chess').set('Accept', 'text/html');
    expect(deep.status).toBe(200);
    expect(deep.text).toContain('spa');
    const missing = await app.get('/missing.png').set('Accept', 'image/png');
    expect(missing.status).toBe(404);
    const apiMissing = await app.get('/api/nope').set('Accept', 'text/html');
    expect(apiMissing.status).toBe(404);
    expect(apiMissing.body.error.code).toBe('NOT_FOUND');
  });
});
