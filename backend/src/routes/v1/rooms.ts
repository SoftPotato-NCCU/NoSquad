import { Hono } from "hono";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../db/connection";
import { apiError } from "../../lib/errors";
import { authMiddleware, type AuthVariables } from "./middleware/auth";

// ── ROUTES: /api/v1/rooms ───────────────────────────────────────────────────────

const rooms = new Hono<{ Variables: AuthVariables }>();
rooms.use("*", authMiddleware);

// ── HELPERS ─────────────────────────────────────────────────────────────────────

type RoomDisplayStatus = "open" | "recruiting_closed" | "in_progress" | "ended" | "cancelled";

function toISO(d: Date | string | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

// Computes frontend-facing status from DB status + event times.
// Priority: cancelled > ended (by time) > in_progress > recruiting_closed > open
function computeDisplayStatus(
  dbStatus: string,
  eventTime: Date | string | null,
  eventEndTime: Date | string | null,
): RoomDisplayStatus {
  if (dbStatus === "cancelled") return "cancelled";

  const now = new Date();
  if (eventEndTime && new Date(eventEndTime) <= now) return "ended";
  if (eventTime && new Date(eventTime) <= now) return "in_progress";

  if (dbStatus === "recruiting_closed") return "recruiting_closed";
  if (dbStatus === "open") return "open";
  throw new Error(`Unhandled room status: ${dbStatus}`);
}

function formatMyRoom(r: RowDataPacket, userId: string) {
  return {
    id: r.uuid,
    name: r.title,
    description: r.description ?? null,
    room_status: computeDisplayStatus(r.status, r.event_time, r.event_end_time),
    category: r.category ?? null,
    member_count: Number(r.member_count),
    max_capacity: r.max_members,
    join_approval_required: Boolean(r.join_approval_required),
    event_time: toISO(r.event_time),
    event_end_time: toISO(r.event_end_time),
    created_at: toISO(r.created_at as Date),
    is_owner: r.creator_id === userId,
    membership_status: (r.membership_status as "approved" | "pending" | "rejected") ?? "approved",
  };
}

function formatHallRoom(r: RowDataPacket) {
  const memberCount = Number(r.member_count);
  return {
    id: r.uuid,
    name: r.title,
    description: r.description ?? null,
    room_status: computeDisplayStatus(r.status, r.event_time, r.event_end_time),
    category: r.category ?? null,
    member_count: memberCount,
    max_capacity: r.max_members,
    join_approval_required: Boolean(r.join_approval_required),
    created_at: toISO(r.created_at as Date),
    is_joined: !!Number(r.is_joined),
    is_full: memberCount >= (r.max_members as number),
  };
}

function formatRoomDetails(r: RowDataPacket, userId: string) {
  return {
    id: r.uuid,
    name: r.title,
    description: r.description ?? null,
    room_status: computeDisplayStatus(r.status, r.event_time, r.event_end_time),
    category: r.category ?? null,
    member_count: Number(r.member_count),
    max_capacity: r.max_members,
    join_approval_required: Boolean(r.join_approval_required),
    event_time: toISO(r.event_time),
    event_end_time: toISO(r.event_end_time),
    location: r.location ?? null,
    created_at: toISO(r.created_at as Date),
    is_owner: r.creator_id === userId,
    is_member: !!Number(r.is_member),
    membership_status: r.membership_status ?? null,
  };
}

const ACTIVE_STATUSES = "('open','recruiting_closed')";

function formatMember(r: RowDataPacket) {
  return {
    user_id: r.user_id,
    name: r.name,
    username: r.username,
    approval_status: r.approval_status,
    joined_at: toISO(r.joined_at as Date),
    is_owner: !!Number(r.is_owner),
  };
}

// ── LIST MY ROOMS ─────────────────────────────────────────────────────────────────
// GET /api/v1/rooms - List rooms the authenticated user is a member of
rooms.get("/", async (c) => {
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);
  const cursor = c.req.query("cursor");
  const includePending = c.req.query("include_pending") === "true";

  const params: (string | number)[] = [userId];
  let cursorClause = "";
  if (cursor) {
    cursorClause = "AND r.created_at < ?";
    params.push(cursor);
  }

  let membershipFilter = "rm_me.approval_status = 'approved'";
  if (includePending) {
    membershipFilter = "rm_me.approval_status IN ('approved', 'pending')";
  }

  params.push(limit + 1);

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*,
        rm_me.approval_status AS membership_status,
        COUNT(rm_all.user_id) AS member_count
     FROM rooms r
     LEFT JOIN room_members rm_me ON rm_me.room_id = r.uuid AND rm_me.user_id = ?
     LEFT JOIN room_members rm_all ON rm_all.room_id = r.uuid AND rm_all.approval_status = 'approved'
     WHERE r.status IN ${ACTIVE_STATUSES} AND rm_me.user_id IS NOT NULL AND ${membershipFilter} ${cursorClause}
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
        next_cursor: hasNext
          ? toISO((items.at(-1)?.created_at as Date) ?? null)
          : null,
        limit,
      },
    },
  });
});

// ── LIST ROOM HALL ───────────────────────────────────────────────────────────────
// GET /api/v1/rooms/hall - List all open rooms with optional filters
rooms.get("/hall", async (c) => {
  const userId = c.get("userId");
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);
  const cursor = c.req.query("cursor");
  const includeJoined = c.req.query("include_joined") === "true";
  const includeFull = c.req.query("include_full") === "true";
  const validCategories = ["sports", "study", "entertainment", "social"];
  const categoryFilter = c.req.query("category");
  const category =
    categoryFilter && validCategories.includes(categoryFilter)
      ? categoryFilter
      : null;

  const params: (string | number)[] = [userId];
  let cursorClause = "";
  if (cursor) {
    cursorClause = "AND r.created_at < ?";
    params.push(cursor);
  }
  let categoryClause = "";
  if (category) {
    categoryClause = "AND r.category = ?";
    params.push(category);
  }

  const outerConds: string[] = [];
  if (!includeJoined) outerConds.push("sub.is_joined = 0");
  if (!includeFull) outerConds.push("sub.member_count < sub.max_members");
  const outerWhere = outerConds.length
    ? `WHERE ${outerConds.join(" AND ")}`
    : "";

  params.push(limit + 1);

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT sub.* FROM (
       SELECT r.*,
         COUNT(CASE WHEN rm.approval_status = 'approved' THEN 1 END) AS member_count,
         MAX(CASE WHEN rm.user_id = ? THEN 1 ELSE 0 END) AS is_joined
       FROM rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.uuid
       WHERE r.status = 'open'
         AND (r.event_time IS NULL OR r.event_time > NOW())
         ${cursorClause}
         ${categoryClause}
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
        next_cursor: hasNext
          ? toISO((items.at(-1)?.created_at as Date) ?? null)
          : null,
        limit,
      },
    },
  });
});

// ── GET ROOM DETAILS ─────────────────────────────────────────────────────────────
// GET /api/v1/rooms/:room_id - Get detailed info about a room including user's membership status
rooms.get("/:room_id", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*,
       COUNT(CASE WHEN rm.approval_status = 'approved' THEN 1 END) AS member_count,
       MAX(CASE WHEN rm.user_id = ? THEN 1 ELSE 0 END) AS is_member,
       MAX(CASE WHEN rm.user_id = ? THEN rm.approval_status ELSE NULL END) AS membership_status
     FROM rooms r
     LEFT JOIN room_members rm ON rm.room_id = r.uuid
     WHERE r.uuid = ?
     GROUP BY r.uuid`,
    [userId, userId, roomId],
  );

  if (!rows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  return c.json({ data: { room: formatRoomDetails(rows[0], userId) } });
});

// ── CREATE ROOM ──────────────────────────────────────────────────────────────────
// POST /api/v1/rooms - Create a new room (creator becomes owner and auto-approved member)
rooms.post("/", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body)
    return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data");

  if (!body.name)
    return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data", [
      { field: "name", issue: "required", message: "Room name is required" },
    ]);

  if (typeof body.event_time !== "string" || !body.event_time)
    return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data", [
      { field: "event_time", issue: "required", message: "Event time is required" },
    ]);
  
  // check start time earlier than now
  if (new Date(body.event_time) <= new Date())
    return apiError(c, 400, "VALIDATION_ERROR", "Event time must be in the future", [
      { field: "event_time", issue: "invalid_value", message: "Event time must be in the future" },
    ]);
  
  // if end time provided, check end time later than start time
  if (body.event_end_time) {
    if (typeof body.event_end_time !== "string")
      return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data", [
        { field: "event_end_time", issue: "invalid_type", message: "Event end time must be a string" },
      ]);
    if (new Date(body.event_end_time) <= new Date(body.event_time))
      return apiError(c, 400, "VALIDATION_ERROR", "Event end time must be after event time", [
        { field: "event_end_time", issue: "invalid_value", message: "Event end time must be after event time" },
      ]);
  }

  const maxCapacity = Number(body.max_capacity ?? 10);
  if (maxCapacity > 50)
    return apiError(c, 400, "CAPACITY_EXCEEDED", "Maximum room capacity is 50");
  if (maxCapacity < 1)
    return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data", [
      {
        field: "max_capacity",
        issue: "min_value",
        message: "Capacity must be at least 1",
      },
    ]);

  const joinApprovalRequired = body.join_approval_required === true;
  const roomId = crypto.randomUUID();
  const description =
    typeof body.description === "string" ? body.description : null;
  const location =
    typeof body.location === "string" ? body.location : null;
  const validCategories = ["sports", "study", "entertainment", "social"];
  const category =
    typeof body.category === "string" && validCategories.includes(body.category)
      ? body.category
      : null;
  const eventTime = new Date(body.event_time as string);
  const eventEndTime =
    typeof body.event_end_time === "string"
      ? new Date(body.event_end_time)
      : eventTime;

  await pool.execute(
    "INSERT INTO rooms (uuid, title, description, creator_id, max_members, join_approval_required, event_time, event_end_time, location, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      roomId,
      body.name as string,
      description,
      userId,
      maxCapacity,
      joinApprovalRequired,
      eventTime,
      eventEndTime,
      location,
      category,
    ],
  );
  await pool.execute(
    "INSERT INTO room_members (room_id, user_id, approval_status) VALUES (?, ?, 'approved')",
    [roomId, userId],
  );

  return c.json(
    {
      data: {
        room: {
          id: roomId,
          name: body.name,
          description,
          room_status: "open" as const,
          member_count: 1,
          max_capacity: maxCapacity,
          join_approval_required: joinApprovalRequired,
          event_time: eventTime.toISOString(),
          event_end_time: eventEndTime.toISOString(),
          location,
          created_at: new Date().toISOString(),
          is_owner: true,
          is_member: true,
          membership_status: "approved" as const,
        },
      },
    },
    201,
  );
});

// ── UPDATE ROOM ──────────────────────────────────────────────────────────────────
// PATCH /api/v1/rooms/:room_id - Update room settings (owner only)
rooms.patch("/:room_id", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");
  const body = (await c.req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body)
    return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can update this room",
    );

  const updates: string[] = [];
  const params: (string | number | boolean | Date | null)[] = [];

  if (typeof body.name === "string" && body.name.length > 0) {
    updates.push("title = ?");
    params.push(body.name);
  }
  if (typeof body.description === "string") {
    updates.push("description = ?");
    params.push(body.description);
  }
  if (typeof body.max_capacity === "number") {
    const newCap = body.max_capacity;
    if (newCap > 50)
      return apiError(
        c,
        400,
        "CAPACITY_EXCEEDED",
        "Maximum room capacity is 50",
      );
    if (newCap < 1)
      return apiError(c, 400, "VALIDATION_ERROR", "Invalid request data", [
        {
          field: "max_capacity",
          issue: "min_value",
          message: "Capacity must be at least 1",
        },
      ]);
    updates.push("max_members = ?");
    params.push(newCap);
  }
  if (typeof body.join_approval_required === "boolean") {
    const newValue = body.join_approval_required;
    const oldValue = Boolean(roomRows[0].join_approval_required);
    updates.push("join_approval_required = ?");
    params.push(newValue);
    if (oldValue === true && newValue === false) {
      const [currentCount] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND approval_status = 'approved'",
        [roomId],
      );
      const [pendingCount] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND approval_status = 'pending'",
        [roomId],
      );
      const currentApproved = Number(currentCount[0]?.count ?? 0);
      const pending = Number(pendingCount[0]?.count ?? 0);
      const maxMembers = roomRows[0]?.max_members;
      if (maxMembers && pending > 0 && currentApproved + pending <= maxMembers) {
        await pool.execute(
          "UPDATE room_members SET approval_status = 'approved' WHERE room_id = ? AND approval_status = 'pending'",
          [roomId],
        );
      }
    }
  }
  if (typeof body.event_time === "string" || body.event_time === null) {
    updates.push("event_time = ?");
    params.push(body.event_time ? new Date(body.event_time) : null);
  }
  if (typeof body.event_end_time === "string" || body.event_end_time === null) {
    updates.push("event_end_time = ?");
    params.push(body.event_end_time ? new Date(body.event_end_time) : null);
  }
  if (typeof body.location === "string" || body.location === null) {
    updates.push("location = ?");
    params.push(body.location);
  }

  if (updates.length === 0)
    return apiError(c, 400, "VALIDATION_ERROR", "No valid fields to update");

  params.push(roomId);
  await pool.execute(
    `UPDATE rooms SET ${updates.join(", ")} WHERE uuid = ?`,
    params,
  );

  return c.json({ data: { success: true, room_id: roomId } });
});

// ── JOIN ROOM ───────────────────────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/join - Request to join a room (auto-approve or pending based on room settings)
rooms.post("/:room_id/join", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*,
       (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.uuid AND rm2.approval_status = 'approved') AS member_count
     FROM rooms r
     WHERE r.uuid = ?`,
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  const room = roomRows[0];

  // Check existing membership FIRST so already-joined / pending users get the
  // correct error code (ALREADY_JOINED / PENDING_REQUEST) regardless of room status.
  const [memberRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM room_members WHERE room_id = ? AND user_id = ?",
    [roomId, userId],
  );
  if (memberRows.length > 0) {
    const existing = memberRows[0]!;
    if (existing.approval_status === "approved")
      return apiError(
        c,
        409,
        "ALREADY_JOINED",
        "You are already a member of this room",
      );
    if (existing.approval_status === "pending")
      return apiError(
        c,
        409,
        "PENDING_REQUEST",
        "You already have a pending join request",
      );
    if (existing.approval_status === "rejected") {
      if (room.status === "recruiting_closed")
        return apiError(
          c,
          400,
          "RECRUITING_CLOSED",
          "This room is no longer accepting new members",
        );
      if (room.status !== "open")
        return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");
      await pool.execute(
        "UPDATE room_members SET approval_status = ?, joined_at = NOW() WHERE room_id = ? AND user_id = ?",
        [room.join_approval_required ? "pending" : "approved", roomId, userId],
      );
      if (!room.join_approval_required)
        return c.json({
          data: { success: true, room_id: roomId, status: "approved" },
        });
      return c.json({
        data: { success: true, room_id: roomId, status: "pending" },
      });
    }
  }

  if (room.status === "recruiting_closed")
    return apiError(
      c,
      400,
      "RECRUITING_CLOSED",
      "This room is no longer accepting new members",
    );

  if (room.status !== "open")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (Number(room.member_count) >= (room.max_members as number))
    return apiError(
      c,
      400,
      "ROOM_FULL",
      "This room has reached its maximum capacity",
    );

  const approvalStatus = room.join_approval_required ? "pending" : "approved";
  await pool.execute(
    "INSERT INTO room_members (room_id, user_id, approval_status) VALUES (?, ?, ?)",
    [roomId, userId, approvalStatus],
  );

  if (room.join_approval_required)
    return c.json({
      data: { success: true, room_id: roomId, status: "pending" },
    });

  return c.json({
    data: { success: true, room_id: roomId, status: "approved" },
  });
});

// ── LEAVE ROOM ──────────────────────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/leave - Leave a room (owner cannot leave, must dismiss instead)
rooms.post("/:room_id/leave", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    `SELECT uuid, creator_id FROM rooms WHERE uuid = ? AND status IN ${ACTIVE_STATUSES}`,
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].creator_id === userId)
    return apiError(
      c,
      403,
      "OWNER_CANNOT_LEAVE",
      "Room owner cannot leave. Please dismiss the room instead.",
    );

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?",
    [roomId, userId],
  );
  if (!memberRows[0])
    return apiError(
      c,
      403,
      "NOT_A_MEMBER",
      "You are not a member of this room",
    );

  await pool.execute(
    "DELETE FROM room_members WHERE room_id = ? AND user_id = ?",
    [roomId, userId],
  );

  return c.json({ data: { success: true, room_id: roomId } });
});

// ── LIST ROOM MEMBERS ───────────────────────────────────────────────────────────
// GET /api/v1/rooms/:room_id/members - List all approved members of a room
rooms.get("/:room_id/members", async (c) => {
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  const userId = c.get("userId");
  const room = roomRows[0];

  // Allow access if user is room owner
  if (room.creator_id !== userId) {
    // Otherwise, check if user is an approved member
    const [memberCheck] = await pool.execute<RowDataPacket[]>(
      "SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ? AND approval_status = 'approved'",
      [roomId, userId],
    );
    if (memberCheck.length === 0) {
      return apiError(
        c,
        403,
        "INSUFFICIENT_PERMISSIONS",
        "Only the room owner and approved members can view the member list",
      );
    }
  }

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    `SELECT rm.*, u.name, u.username,
       CASE WHEN r.creator_id = rm.user_id THEN 1 ELSE 0 END AS is_owner
     FROM room_members rm
     JOIN users u ON u.uuid = rm.user_id
     JOIN rooms r ON r.uuid = rm.room_id
     WHERE rm.room_id = ? AND rm.approval_status = 'approved'
     ORDER BY rm.joined_at ASC`,
    [roomId],
  );

  return c.json({
    data: {
      members: memberRows.map(formatMember),
      room_owner_id: roomRows[0].creator_id,
    },
  });
});

// ── LIST JOIN REQUESTS ──────────────────────────────────────────────────────────
// GET /api/v1/rooms/:room_id/requests - List pending join requests (owner only)
rooms.get("/:room_id/requests", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can view join requests",
    );

  const [requestRows] = await pool.execute<RowDataPacket[]>(
    `SELECT rm.*, u.name, u.username
     FROM room_members rm
     JOIN users u ON u.uuid = rm.user_id
     WHERE rm.room_id = ? AND rm.approval_status = 'pending'
     ORDER BY rm.joined_at ASC`,
    [roomId],
  );

  return c.json({ data: { requests: requestRows.map(formatMember) } });
});

// ── APPROVE JOIN REQUEST ───────────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/requests/:user_id/approve - Approve a join request (owner only)
rooms.post("/:room_id/requests/:user_id/approve", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");
  const targetUserId = c.req.param("user_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can approve requests",
    );

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM room_members WHERE room_id = ? AND user_id = ? AND approval_status = 'pending'",
    [roomId, targetUserId],
  );
  if (!memberRows[0])
    return apiError(
      c,
      404,
      "REQUEST_NOT_FOUND",
      "No pending request found for this user",
    );

  const [currentCount] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND approval_status = 'approved'",
    [roomId],
  );
  if (
    !currentCount[0] ||
    Number(currentCount[0].count) >= roomRows[0].max_members
  )
    return apiError(c, 400, "ROOM_FULL", "Room is at maximum capacity");

  await pool.execute(
    "UPDATE room_members SET approval_status = 'approved' WHERE room_id = ? AND user_id = ?",
    [roomId, targetUserId],
  );

  return c.json({
    data: { success: true, user_id: targetUserId, status: "approved" },
  });
});

// ── APPROVE ALL JOIN REQUESTS ─────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/requests/approve-all - Approve all pending requests (owner only)
rooms.post("/:room_id/requests/approve-all", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can approve requests",
    );

  const [currentCount] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND approval_status = 'approved'",
    [roomId],
  );
  const [pendingCount] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM room_members WHERE room_id = ? AND approval_status = 'pending'",
    [roomId],
  );

  const currentApproved = Number(currentCount[0]?.count ?? 0);
  const pending = Number(pendingCount[0]?.count ?? 0);
  const maxMembers = roomRows[0]?.max_members ?? 0;
  const availableSlots = maxMembers - currentApproved;

  if (availableSlots <= 0)
    return apiError(c, 400, "ROOM_FULL", "Room is at maximum capacity");

  if (pending === 0)
    return c.json({ data: { success: true, approved_count: 0 } });

  const toApprove = Math.min(pending, availableSlots);

  await pool.execute(
    `UPDATE room_members SET approval_status = 'approved' 
     WHERE room_id = ? AND approval_status = 'pending' 
     LIMIT ?`,
    [roomId, toApprove],
  );

  return c.json({ data: { success: true, approved_count: toApprove } });
});

// ── REJECT JOIN REQUEST ─────────────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/requests/:user_id/reject - Reject a join request (owner only)
rooms.post("/:room_id/requests/:user_id/reject", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");
  const targetUserId = c.req.param("user_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can reject requests",
    );

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM room_members WHERE room_id = ? AND user_id = ? AND approval_status = 'pending'",
    [roomId, targetUserId],
  );
  if (!memberRows[0])
    return apiError(
      c,
      404,
      "REQUEST_NOT_FOUND",
      "No pending request found for this user",
    );

  await pool.execute(
    "UPDATE room_members SET approval_status = 'rejected' WHERE room_id = ? AND user_id = ?",
    [roomId, targetUserId],
  );

  return c.json({
    data: { success: true, user_id: targetUserId, status: "rejected" },
  });
});

// ── KICK MEMBER ──────────────────────────────────────────────────────────────────
// DELETE /api/v1/rooms/:room_id/members/:user_id - Remove a member from room (owner only)
rooms.delete("/:room_id/members/:user_id", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");
  const targetUserId = c.req.param("user_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can remove members",
    );

  if (roomRows[0].creator_id === targetUserId)
    return apiError(
      c,
      400,
      "CANNOT_REMOVE_OWNER",
      "Cannot remove the room owner",
    );

  const [memberRows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM room_members WHERE room_id = ? AND user_id = ? AND approval_status = 'approved'",
    [roomId, targetUserId],
  );
  if (!memberRows[0])
    return apiError(
      c,
      404,
      "MEMBER_NOT_FOUND",
      "Member not found in this room",
    );

  await pool.execute(
    "DELETE FROM room_members WHERE room_id = ? AND user_id = ?",
    [roomId, targetUserId],
  );

  return c.json({ data: { success: true, user_id: targetUserId } });
});

// ── CLOSE RECRUITING ────────────────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/recruiting/close - Stop accepting new join requests (owner only)
rooms.post("/:room_id/recruiting/close", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT uuid, creator_id, status FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(c, 404, "ROOM_NOT_FOUND", "The specified room does not exist");

  if (roomRows[0].creator_id !== userId)
    return apiError(c, 403, "NOT_OWNER", "Only the room owner can close recruiting");

  if (roomRows[0].status === "recruiting_closed")
    return c.json({ data: { success: true, room_id: roomId, status: "recruiting_closed" } });

  if (roomRows[0].status !== "open")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  await pool.execute(
    "UPDATE rooms SET status = 'recruiting_closed' WHERE uuid = ?",
    [roomId],
  );

  return c.json({ data: { success: true, room_id: roomId, status: "recruiting_closed" } });
});

// ── OPEN RECRUITING ─────────────────────────────────────────────────────────────
// POST /api/v1/rooms/:room_id/recruiting/open - Resume accepting new join requests (owner only)
rooms.post("/:room_id/recruiting/open", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT uuid, creator_id, status FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(c, 404, "ROOM_NOT_FOUND", "The specified room does not exist");

  if (roomRows[0].creator_id !== userId)
    return apiError(c, 403, "NOT_OWNER", "Only the room owner can resume recruiting");

  if (roomRows[0].status === "open")
    return c.json({ data: { success: true, room_id: roomId, status: "open" } });

  if (roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  await pool.execute(
    "UPDATE rooms SET status = 'open' WHERE uuid = ?",
    [roomId],
  );

  return c.json({ data: { success: true, room_id: roomId, status: "open" } });
});

// ── DISMISS ROOM ─────────────────────────────────────────────────────────────────
// DELETE /api/v1/rooms/:room_id - Dismiss/cancel a room (owner only)
rooms.delete("/:room_id", async (c) => {
  const userId = c.get("userId");
  const roomId = c.req.param("room_id");

  const [roomRows] = await pool.execute<RowDataPacket[]>(
    "SELECT uuid, creator_id, status FROM rooms WHERE uuid = ?",
    [roomId],
  );
  if (!roomRows[0])
    return apiError(
      c,
      404,
      "ROOM_NOT_FOUND",
      "The specified room does not exist",
    );

  if (roomRows[0].status !== "open" && roomRows[0].status !== "recruiting_closed")
    return apiError(c, 400, "ROOM_CLOSED", "This room is no longer active");

  if (roomRows[0].creator_id !== userId)
    return apiError(
      c,
      403,
      "NOT_OWNER",
      "Only the room owner can dismiss this room",
    );

  await pool.execute("UPDATE rooms SET status = 'cancelled' WHERE uuid = ?", [
    roomId,
  ]);

  return c.json({ data: { success: true, room_id: roomId } });
});

export default rooms;
export { toISO, formatMyRoom, formatHallRoom, computeDisplayStatus, formatRoomDetails, formatMember };
