import { createMiddleware } from 'hono/factory';
import type { RowDataPacket } from 'mysql2/promise';
import { verifyToken } from '../lib/jwt';
import { pool } from '../db/connection';
import { apiError } from '../lib/errors';

export type AuthVariables = {
  userId: string;
  tokenId: string;
};

const UNAUTH = 'Authentication required: token is missing or invalid';

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return apiError(c, 401, 'UNAUTHORIZED', UNAUTH);
    }

    let payload;
    try {
      payload = await verifyToken(header.slice(7));
    } catch {
      return apiError(c, 401, 'UNAUTHORIZED', UNAUTH);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT revoked_at FROM user_tokens WHERE uuid = ? AND user_id = ?',
      [payload.jti, payload.sub],
    );

    if (!rows[0] || (rows[0].revoked_at as Date | null) !== null) {
      return apiError(c, 401, 'UNAUTHORIZED', UNAUTH);
    }

    await pool.execute(
      'UPDATE user_tokens SET last_used_at = NOW() WHERE uuid = ?',
      [payload.jti],
    );

    c.set('userId', payload.sub);
    c.set('tokenId', payload.jti);
    await next();
  },
);
