import { createMiddleware } from 'hono/factory';
import { getConnInfo } from 'hono/bun';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../../db/connection';
import { apiError } from '../../../lib/errors';

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

    const token = header.slice(7);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT uuid, user_id, revoked_at FROM user_tokens WHERE token = ?',
      [token],
    );

    if (!rows[0] || (rows[0].revoked_at as Date | null) !== null) {
      return apiError(c, 401, 'UNAUTHORIZED', UNAUTH);
    }

    // Update last_used and IP address on each request (Bun direct connection)
    // TODO: In production behind nginx - use: proxy_set_header X-Real-IP $remote_addr;
    // TODO: In production behind nginx - use: proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    const userAgent = c.req.header('User-Agent');
    const connInfo = getConnInfo(c);
    const ipAddress = connInfo.remote.address ?? null;

    await pool.execute(
      'UPDATE user_tokens SET last_used_at = NOW(), user_agent = ?, ip_address = ? WHERE uuid = ?',
      [userAgent, ipAddress, rows[0].uuid],
    );

    c.set('userId', rows[0].user_id);
    c.set('tokenId', rows[0].uuid);
    await next();
  },
);
