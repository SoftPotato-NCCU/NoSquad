import { createMiddleware } from 'hono/factory';
import { getConnInfo } from 'hono/bun';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../../db/connection';
import { apiError } from '../../../lib/errors';
import { redis, tokenKey } from '../../../lib/redis';

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

    const userAgent = c.req.header('User-Agent') ?? null;
    const connInfo = getConnInfo(c);
    const ipAddress = connInfo.remote.address ?? null;

    // Check Redis cache first; fall back to DB on miss
    let tokenUuid: string;
    let userId: string;

    const cached = await redis.get(tokenKey(token)).catch(() => null);
    if (cached) {
      const parsed = JSON.parse(cached) as { uuid: string; user_id: string };
      tokenUuid = parsed.uuid;
      userId = parsed.user_id;
    } else {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT uuid, user_id, revoked_at FROM user_tokens WHERE token = ?',
        [token],
      );
      if (!rows[0] || (rows[0].revoked_at as Date | null) !== null) {
        return apiError(c, 401, 'UNAUTHORIZED', UNAUTH);
      }
      tokenUuid = rows[0].uuid as string;
      userId = rows[0].user_id as string;
    }

    // TODO: In production behind nginx - use: proxy_set_header X-Real-IP $remote_addr;
    // TODO: In production behind nginx - use: proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    await pool.execute(
      'UPDATE user_tokens SET last_used_at = NOW(), user_agent = ?, ip_address = ? WHERE uuid = ?',
      [userAgent, ipAddress, tokenUuid],
    );

    c.set('userId', userId);
    c.set('tokenId', tokenUuid);
    await next();
  },
);
