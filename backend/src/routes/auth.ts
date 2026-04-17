import { Hono } from 'hono';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/connection';
import { apiError, type ErrorDetail } from '../lib/errors';
import { signToken } from '../lib/jwt';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import type { UserRow } from '../db/types';

const auth = new Hono<{ Variables: AuthVariables }>();

// ── helpers ──────────────────────────────────────────────────────────────────

async function issueToken(userId: string): Promise<string> {
  const tokenId = crypto.randomUUID();
  const jwt = await signToken({ sub: userId, jti: tokenId });
  await pool.execute(
    `INSERT INTO user_tokens (uuid, user_id, token, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [tokenId, userId, jwt],
  );
  return jwt;
}

function publicUser(u: UserRow) {
  return { id: u.uuid, name: u.name, username: u.username, email: u.email, phone: u.phone };
}

// ── POST /register ────────────────────────────────────────────────────────────

auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data');

  const details: ErrorDetail[] = [];

  if (!body.name)
    details.push({ field: 'name', issue: 'required', message: 'Name is required' });
  else if ((body.name as string).length < 1)
    details.push({ field: 'name', issue: 'min_length', message: 'Name must be at least 1 character' });
  else if ((body.name as string).length > 100)
    details.push({ field: 'name', issue: 'max_length', message: 'Name must be at most 100 characters' });

  if (!body.username)
    details.push({ field: 'username', issue: 'required', message: 'Username is required' });
  else if ((body.username as string).length < 3)
    details.push({ field: 'username', issue: 'min_length', message: 'Username must be at least 3 characters' });
  else if ((body.username as string).length > 20)
    details.push({ field: 'username', issue: 'max_length', message: 'Username must be at most 20 characters' });
  else if (!/^[a-zA-Z0-9_]+$/.test(body.username))
    details.push({ field: 'username', issue: 'format', message: 'Username must contain only letters, numbers, and underscores' });

  if (!body.email)
    details.push({ field: 'email', issue: 'required', message: 'Email is required' });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    details.push({ field: 'email', issue: 'format', message: 'Invalid email format' });

  if (!body.phone)
    details.push({ field: 'phone', issue: 'required', message: 'Phone is required' });
  else if (!/^\+[1-9]\d{1,14}$/.test(body.phone))
    details.push({ field: 'phone', issue: 'format', message: 'Phone must be in E.164 format (e.g., +1234567890)' });

  if (!body.password)
    details.push({ field: 'password', issue: 'required', message: 'Password is required' });
  else if ((body.password as string).length < 8)
    details.push({ field: 'password', issue: 'min_length', message: 'Password must be at least 8 characters' });
  else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(body.password))
    details.push({ field: 'password', issue: 'complexity', message: 'Password must contain uppercase, lowercase, number, and special character' });

  if (details.length > 0)
    return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data', details);

  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT uuid FROM users WHERE email = ? OR username = ? OR phone = ?',
    [body.email, body.username, body.phone],
  );
  if (existing.length > 0)
    return apiError(c, 409, 'USER_EXISTS', 'One or more credentials (email, username, or phone) are already in use');

  const userId = crypto.randomUUID();
  const hashed = await Bun.password.hash(body.password);

  await pool.execute(
    'INSERT INTO users (uuid, name, username, email, phone, hashed_password) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, body.name, body.username, body.email, body.phone, hashed],
  );

  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE uuid = ?', [userId]);
  const user = rows[0] as UserRow;
  const access_token = await issueToken(userId);

  return c.json({ data: { user: publicUser(user), access_token } });
});

// ── POST /login ───────────────────────────────────────────────────────────────

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data');

  if (!body.identifier)
    return apiError(c, 400, 'VALIDATION_ERROR', 'Identifier is required', [
      { field: 'identifier', issue: 'required', message: 'Email, username, or phone is required' },
    ]);

  if (!body.password)
    return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data', [
      { field: 'password', issue: 'required', message: 'Password is required' },
    ]);

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ? OR username = ? OR phone = ?',
    [body.identifier, body.identifier, body.identifier],
  );
  const user = rows[0] as UserRow | undefined;

  if (!user || !(await Bun.password.verify(body.password, user.hashed_password)))
    return apiError(c, 401, 'INVALID_CREDENTIALS', 'The credentials provided are incorrect');

  await pool.execute('UPDATE users SET last_activity = NOW() WHERE uuid = ?', [user.uuid]);

  const access_token = await issueToken(user.uuid);
  return c.json({ data: { user: publicUser(user), access_token } });
});

// ── POST /logout ──────────────────────────────────────────────────────────────

auth.post('/logout', authMiddleware, async (c) => {
  await pool.execute('UPDATE user_tokens SET revoked_at = NOW() WHERE uuid = ?', [c.get('tokenId')]);
  return c.json({ data: { success: true, message: 'Successfully logged out' } });
});

// ── Passkey stubs (need @teamhanko/passkeys-sdk or @simplewebauthn/server) ────

auth.post('/passkey/register/start', authMiddleware, (c) =>
  apiError(c, 501, 'NOT_IMPLEMENTED', 'Passkey support is not yet configured'),
);
auth.post('/passkey/register/finish', authMiddleware, (c) =>
  apiError(c, 501, 'NOT_IMPLEMENTED', 'Passkey support is not yet configured'),
);
auth.post('/passkey/login/start', (c) =>
  apiError(c, 501, 'NOT_IMPLEMENTED', 'Passkey support is not yet configured'),
);
auth.post('/passkey/login/finish', (c) =>
  apiError(c, 501, 'NOT_IMPLEMENTED', 'Passkey support is not yet configured'),
);
auth.delete('/passkey/:passkey_id', authMiddleware, (c) =>
  apiError(c, 501, 'NOT_IMPLEMENTED', 'Passkey support is not yet configured'),
);
auth.get('/passkey/list', authMiddleware, (c) =>
  apiError(c, 501, 'NOT_IMPLEMENTED', 'Passkey support is not yet configured'),
);

export default auth;
