import type { Context } from 'hono';

export interface ErrorDetail {
  field?: string;
  issue?: string;
  message: string;
}

type StatusCode = 400 | 401 | 403 | 404 | 409 | 500 | 501;

export function apiError(
  c: Context,
  status: StatusCode,
  code: string,
  message: string,
  details: ErrorDetail[] = [],
) {
  return c.json({ error: { code, message, details } }, status);
}
