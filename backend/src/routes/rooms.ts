import { Hono } from 'hono';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/connection';
import { apiError } from '../lib/errors';
import { authMiddleware, type AuthVariables } from '../middleware/auth';

const rooms = new Hono<{ Variables: AuthVariables }>();
rooms.use('*', authMiddleware);

// ── helpers ───────────────────────────────────────────────────────────────────

function toISO(d: Date | string | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function formatMyRoom(r: RowDataPacket, userId: string) {
  return {
    id: r.uuid,
    name: r.title,
    description: r.description ?? null,
    member_count: Number(r.member_count),
    max_capacity: r.max_members,
    created_at: toISO(r.created_at as Date),
    is_owner: r.creator_id === userId,
  };
}

function formatHallRoom(r: RowDataPacket) {
  const memberCount = Number(r.member_count);
  return {
    id: r.uuid,
    name: r.title,
    description: r.description ?? null,
    member_count: memberCount,
    max_capacity: r.max_members,
    created_at: toISO(r.created_at as Date),
    is_joined: !!Number(r.is_joined),
    is_full: memberCount >= (r.max_members as number),
  };
}

// ── GET /api/v1/rooms  (user's rooms) ─────────────────────────────────────────

rooms.get('/', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 50);
  const cursor = c.req.query('cursor');

  const params: (string | number)[] = [userId];
  let cursorClause = '';
  if (cursor) {
    cursorClause = 'AND r.created_at < ?';
    params.push(cursor);
  }
  params.push(limit + 1);

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*, COUNT(rm_all.user_id) AS member_count
     FROM rooms r
     JOIN room_members rm_me  ON rm_me.room_id  = r.uuid AND rm_me.user_id = ?
     LEFT JOIN room_members rm_all ON rm_all.room_id = r.uuid
     WHERE r.status = 'active' ${cursorClause}
     GROUP BY r.uuid
     ORDER BY r.created_at DESC
     LIMIT ?`,
    params,
  );

  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);

  return c.json({
    data: {
      rooms: items.map((r) => formatMyRoom(r, userId)),
      pagination: {
        has_next: hasNext,
        next_cursor: hasNext ? toISO(items.at(-1)?.created_at as Date ?? null) : null,
        limit,
      },
    },
  });
});

// ── GET /api/v1/rooms/hall  (public listing) ──────────────────────────────────

rooms.get('/hall', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 50);
  const cursor = c.req.query('cursor');
  const includeJoined = c.req.query('include_joined') === 'true';
  const includeFull = c.req.query('include_full') === 'true';

  const params: (string | number)[] = [userId];
  let cursorClause = '';
  if (cursor) {
    cursorClause = 'AND r.created_at < ?';
    params.push(cursor);
  }

  const outerConds: string[] = [];
  if (!includeJoined) outerConds.push('sub.is_joined = 0');
  if (!includeFull) outerConds.push('sub.member_count < sub.max_members');
  const outerWhere = outerConds.length ? `WHERE ${outerConds.join(' AND ')}` : '';

  params.push(limit + 1);

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT sub.* FROM (
       SELECT r.*,
         COUNT(rm.user_id) AS member_count,
         MAX(CASE WHEN rm.user_id = ? THEN 1 ELSE 0 END) AS is_joined
       FROM rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.uuid
       WHERE r.status = 'active' ${cursorClause}
       GROUP BY r.uuid
     ) AS sub
     ${outerWhere}
     ORDER BY sub.created_at DESC
     LIMIT ?`,
    params,
  );

  const hasNext = rows.length > limit;
  const items = rows.slice(0, limit);

  return c.json({
    data: {
      rooms: items.map(formatHallRoom),
      pagination: {
        has_next: hasNext,
        next_cursor: hasNext ? toISO(items.at(-1)?.created_at as Date ?? null) : null,
        limit,
      },
    },
  });
});

// ── POST /api/v1/rooms  (create) ──────────────────────────────────────────────

rooms.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data');

  if (!body.name)
    return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data', [
      { field: 'name', issue: 'required', message: 'Room name is required' },
    ]);

  const maxCapacity = Number(body.max_capacity ?? 10);
  if (maxCapacity > 50)
    return apiError(c, 400, 'CAPACITY_EXCEEDED', 'Maximum room capacity is 50');
  if (maxCapacity < 1)
    return apiError(c, 400, 'VALIDATION_ERROR', 'Invalid request data', [
      { field: 'max_capacity', issue: 'min_value', message: 'Capacity must be at least 1' },
    ]);

  const roomId = crypto.randomUUID();
  const description = typeof body.description === 'string' ? body.description : null;

  await pool.execute(
    'INSERT INTO rooms (uuid, title, description, creator_id, max_members) VALUES (?, ?, ?, ?, ?)',
    [roomId, body.name as string, description, userId, maxCapacity],
  );
  await pool.execute('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)', [roomId, userId]);

  return c.json(
    {
      data: {
        room: {
          id: roomId,
          name: body.name,
          description,
          member_count: 1,
          max_capacity: maxCapacity,
          created_at: new Date().toISOString(),
          is_owner: true,
        },
      },
    },
    201,
  );
});

// ── POST /api/v1/rooms/:room_id/join ──────────────────────────────────────────

rooms.post('/:room_id/join', async (c) => {
  const userId = c.get('userId');
  const roomId = c.req.param('room_id');

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*, COUNT(rm.user_id) AS member_count
     FROM rooms r
     LEFT JOIN room_members rm ON rm.room_id = r.uuid
     WHERE r.uuid = ? AND r.status = 'active'
     GROUP BY r.uuid`,
    [roomId],
  );
  if (!roomRows[0]) return apiError(c, 404, 'ROOM_NOT_FOUND', 'The specified room does not exist');

  const room = roomRows[0];

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?',
    [roomId, userId],
  );
  if (memberRows.length > 0)
    return apiError(c, 409, 'ALREADY_JOINED', 'You are already a member of this room');

  if (Number(room.member_count) >= (room.max_members as number))
    return apiError(c, 400, 'ROOM_FULL', 'This room has reached its maximum capacity');

  await pool.execute('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)', [roomId, userId]);

  return c.json({ data: { success: true, room_id: roomId } });
});

// ── POST /api/v1/rooms/:room_id/leave ─────────────────────────────────────────

rooms.post('/:room_id/leave', async (c) => {
  const userId = c.get('userId');
  const roomId = c.req.param('room_id');

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT uuid, creator_id FROM rooms WHERE uuid = ? AND status = 'active'",
    [roomId],
  );
  if (!roomRows[0]) return apiError(c, 404, 'ROOM_NOT_FOUND', 'The specified room does not exist');

  if (roomRows[0].creator_id === userId)
    return apiError(c, 403, 'OWNER_CANNOT_LEAVE', 'Room owner cannot leave. Please dismiss the room instead.');

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?',
    [roomId, userId],
  );
  if (!memberRows[0]) return apiError(c, 403, 'NOT_A_MEMBER', 'You are not a member of this room');

  await pool.execute('DELETE FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, userId]);

  return c.json({ data: { success: true, room_id: roomId } });
});

// ── DELETE /api/v1/rooms/:room_id  (dismiss) ──────────────────────────────────

rooms.delete('/:room_id', async (c) => {
  const userId = c.get('userId');
  const roomId = c.req.param('room_id');

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT uuid, creator_id FROM rooms WHERE uuid = ? AND status = 'active'",
    [roomId],
  );
  if (!roomRows[0]) return apiError(c, 404, 'ROOM_NOT_FOUND', 'The specified room does not exist');

  if (roomRows[0].creator_id !== userId)
    return apiError(c, 403, 'NOT_OWNER', 'Only the room owner can dismiss this room');

  await pool.execute("UPDATE rooms SET status = 'closed' WHERE uuid = ?", [roomId]);

  return c.json({ data: { success: true, room_id: roomId } });
});

export default rooms;
