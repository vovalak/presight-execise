import { isIsoDate } from '../dates.js';
import { HttpError } from '../http/errors.js';
import { ORDERS, SORT_FIELDS, type Order, type SortField } from './types.js';

export interface Cursor {
  value: string;
  id: number;
}

interface CursorPayload extends Cursor {
  sort: SortField;
  order: Order;
}

export function encodeCursor(payload: CursorPayload): string {
  const compact = { s: payload.sort, o: payload.order, v: payload.value, id: payload.id };
  return Buffer.from(JSON.stringify(compact), 'utf8').toString('base64url');
}

function invalidCursor(reason: string): HttpError {
  return new HttpError(400, 'INVALID_CURSOR', `Invalid cursor: ${reason}`);
}

export function decodeCursor(raw: string, sort: SortField, order: Order): Cursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor('malformed');
  }
  if (typeof parsed !== 'object' || parsed === null) throw invalidCursor('malformed');

  const { s, o, v, id } = parsed as Record<string, unknown>;
  if (!SORT_FIELDS.includes(s as SortField) || !ORDERS.includes(o as Order)) {
    throw invalidCursor('malformed');
  }
  if (s !== sort || o !== order) throw invalidCursor('it belongs to a different sort');
  if (!Number.isInteger(id) || (id as number) < 1) throw invalidCursor('malformed');

  if (typeof v !== 'string' || (sort === 'age' && !isIsoDate(v))) {
    throw invalidCursor('value does not match the sort field');
  }
  return { value: v, id: id as number };
}
