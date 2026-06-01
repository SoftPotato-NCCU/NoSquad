import { Hono } from 'hono';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../../db/connection';
import { apiError } from '../../lib/errors';
import { authMiddleware, type AuthVariables } from './middleware/auth';

const users = new Hono<{ Variables: AuthVariables }>();
users.use('*', authMiddleware);

// GET /api/v1/users/me/points
users.get('/me/points', async (c) => {
  const userId = c.get('userId');

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT points FROM users WHERE uuid = ?',
    [userId],
  );

  if (!rows[0])
    return apiError(c, 404, 'USER_NOT_FOUND', 'User not found');

  return c.json({ data: { points: Number(rows[0].points) } });
});

export default users;
