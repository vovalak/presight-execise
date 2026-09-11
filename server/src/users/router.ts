import { Router } from 'express';
import { isoDate } from '../dates.js';
import type { Db } from '../db/connection.js';
import { parseFacetParams, parseListParams } from './params.js';
import { getFacets, listUsers } from './service.js';

export function createUsersRouter(db: Db, now: () => Date): Router {
  const router = Router();

  router.get('/users', (req, res) => {
    res.json(listUsers(db, parseListParams(req.query), isoDate(now())));
  });

  router.get('/users/facets', (req, res) => {
    res.json(getFacets(db, parseFacetParams(req.query)));
  });

  return router;
}
