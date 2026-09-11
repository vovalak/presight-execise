import { z } from 'zod';
import { HttpError } from '../http/errors.js';
import {
  DEFAULT_LIMIT,
  DEFAULT_ORDER,
  DEFAULT_SORT,
  MAX_LIMIT,
  ORDERS,
  SORT_FIELDS,
  type Filters,
  type ListParams,
} from './types.js';

const MAX_MULTI_VALUES = 20;
const MAX_TEXT_LENGTH = 100;

/**
 * Express 5's default ("simple") query parser yields a string for `hobby=a`
 * and an array for `hobby=a&hobby=b`. Normalise both to a trimmed, de-duplicated list.
 */
const multiValue = z.preprocess(
  (value) => {
    const raw = value === undefined ? [] : Array.isArray(value) ? value : [value];
    const cleaned = raw
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return [...new Set(cleaned)];
  },
  z.array(z.string().max(MAX_TEXT_LENGTH)).max(MAX_MULTI_VALUES),
);

const singleText = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().trim().max(MAX_TEXT_LENGTH).default(''),
);

const optionalNumber = (schema: z.ZodType<number>) =>
  z.preprocess((value) => (value === undefined || value === '' ? undefined : value), schema);

export const facetParamsSchema = z.object({
  q: singleText,
  hobby: multiValue,
  nationality: multiValue,
});

export const listParamsSchema = facetParamsSchema.extend({
  sort: z.enum(SORT_FIELDS).default(DEFAULT_SORT),
  order: z.enum(ORDERS).default(DEFAULT_ORDER),
  limit: optionalNumber(z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)),
  cursor: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().max(2048).optional(),
  ),
});

function invalid(error: z.ZodError): HttpError {
  return new HttpError(400, 'BAD_REQUEST', 'Invalid query parameters', z.flattenError(error));
}

export function parseFacetParams(query: unknown): Filters {
  const result = facetParamsSchema.safeParse(query);
  if (!result.success) throw invalid(result.error);
  return { q: result.data.q, hobbies: result.data.hobby, nationalities: result.data.nationality };
}

export function parseListParams(query: unknown): ListParams {
  const result = listParamsSchema.safeParse(query);
  if (!result.success) throw invalid(result.error);
  const { q, hobby, nationality, sort, order, limit, cursor } = result.data;
  return { q, hobbies: hobby, nationalities: nationality, sort, order, limit, cursor };
}
