import { expect, describe, test } from "bun:test";
import { computeDisplayStatus, formatRoomDetails, formatMember, roleFilterClause, computeJoinStatus } from "../../src/routes/v1/rooms";

describe("computeJoinStatus", () => {
  test("full room → waitlisted regardless of approval requirement", () => {
    expect(computeJoinStatus(true, false)).toBe("waitlisted");
    expect(computeJoinStatus(true, true)).toBe("waitlisted");
  });

  test("open room with approval required → pending", () => {
    expect(computeJoinStatus(false, true)).toBe("pending");
  });

  test("open room without approval → approved", () => {
    expect(computeJoinStatus(false, false)).toBe("approved");
  });
});

describe("roleFilterClause", () => {
  test("returns empty clause and valid when role is undefined", () => {
    expect(roleFilterClause(undefined)).toEqual({ clause: "", valid: true });
  });

  test("returns creator equality clause for owner", () => {
    expect(roleFilterClause("owner")).toEqual({ clause: "AND r.creator_id = ?", valid: true });
  });

  test("returns creator inequality clause for member", () => {
    expect(roleFilterClause("member")).toEqual({ clause: "AND r.creator_id <> ?", valid: true });
  });

  test("flags unknown role as invalid", () => {
    expect(roleFilterClause("admin")).toEqual({ clause: "", valid: false });
    expect(roleFilterClause("")).toEqual({ clause: "", valid: false });
  });
});

describe("computeDisplayStatus", () => {
  test("returns cancelled when db status is cancelled", () => {
    expect(computeDisplayStatus("cancelled", null, null)).toBe("cancelled");
  });

  test("returns ended when event_end_time is in the past", () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(computeDisplayStatus("open", null, past)).toBe("ended");
  });

  test("returns in_progress when event_time is in the past but end is in future", () => {
    const past = new Date(Date.now() - 1800000).toISOString();
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(computeDisplayStatus("open", past, future)).toBe("in_progress");
  });

  test("returns in_progress when only event_time is set and it is in the past", () => {
    const past = new Date(Date.now() - 1800000).toISOString();
    expect(computeDisplayStatus("open", past, null)).toBe("in_progress");
  });

  test("returns recruiting_closed when db status is recruiting_closed and event not started", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(computeDisplayStatus("recruiting_closed", future, null)).toBe("recruiting_closed");
  });

  test("returns open when db status is open and event not started", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(computeDisplayStatus("open", future, null)).toBe("open");
  });

  test("returns open when no event time is set", () => {
    expect(computeDisplayStatus("open", null, null)).toBe("open");
  });

  test("throws for unknown status", () => {
    expect(() => computeDisplayStatus("unknown", null, null)).toThrow("Unhandled room status");
  });
});

describe("formatRoomDetails", () => {
  test("returns correct shape for owner", () => {
    const row = {
      uuid: "room-1",
      title: "Detail Room",
      description: "A detailed room",
      status: "open",
      creator_id: "user-1",
      member_count: 3,
      max_members: 10,
      join_approval_required: 0,
      event_time: new Date("2030-06-20T14:00:00Z"),
      event_end_time: new Date("2030-06-20T16:00:00Z"),
      location: "Room 101",
      created_at: new Date("2024-06-15T10:30:00Z"),
      is_member: 1,
      membership_status: "approved",
      owner_credit_score: 10,
      owner_name: "Alice",
    };

    const result = formatRoomDetails(row, "user-1");

    expect(result).toEqual({
      id: "room-1",
      name: "Detail Room",
      description: "A detailed room",
      room_status: "open",
      category: null,
      member_count: 3,
      max_capacity: 10,
      join_approval_required: false,
      event_time: "2030-06-20T14:00:00.000Z",
      event_end_time: "2030-06-20T16:00:00.000Z",
      location: "Room 101",
      created_at: "2024-06-15T10:30:00.000Z",
      is_owner: true,
      is_member: true,
      membership_status: "approved",
      owner_credit_score: 10,
      owner_name: "Alice",
    });
  });

  test("is_owner false when user is not creator", () => {
    const row = {
      uuid: "room-1",
      title: "Room",
      description: null,
      status: "open",
      creator_id: "user-creator",
      member_count: 2,
      max_members: 5,
      join_approval_required: 1,
      event_time: null,
      event_end_time: null,
      location: null,
      created_at: new Date(),
      is_member: 1,
      membership_status: "approved",
      owner_credit_score: 10,
    };

    const result = formatRoomDetails(row, "other-user");

    expect(result.is_owner).toBe(false);
    expect(result.location).toBeNull();
    expect(result.join_approval_required).toBe(true);
  });

  test("handles null fields", () => {
    const row = {
      uuid: "room-2",
      title: "Minimal Room",
      description: null,
      status: "open",
      creator_id: "user-1",
      member_count: 0,
      max_members: 1,
      join_approval_required: 0,
      event_time: null,
      event_end_time: null,
      location: null,
      created_at: new Date("2024-01-01T00:00:00Z"),
      is_member: 0,
      membership_status: null,
      owner_credit_score: 10,
    };

    const result = formatRoomDetails(row, "user-1");

    expect(result.description).toBeNull();
    expect(result.event_time).toBeNull();
    expect(result.event_end_time).toBeNull();
    expect(result.location).toBeNull();
    expect(result.is_member).toBe(false);
    expect(result.membership_status).toBeNull();
  });
});

describe("formatMember", () => {
  test("returns correct shape", () => {
    const row = {
      user_id: "user-1",
      name: "Alice",
      username: "alice",
      approval_status: "approved",
      joined_at: new Date("2024-01-15T08:00:00Z"),
      is_owner: 1,
    };

    const result = formatMember(row);

    expect(result).toEqual({
      user_id: "user-1",
      name: "Alice",
      username: "alice",
      approval_status: "approved",
      joined_at: "2024-01-15T08:00:00.000Z",
      is_owner: true,
    });
  });

  test("is_owner false when not owner", () => {
    const row = {
      user_id: "user-2",
      name: "Bob",
      username: "bob",
      approval_status: "pending",
      joined_at: new Date(),
      is_owner: 0,
    };

    const result = formatMember(row);

    expect(result.is_owner).toBe(false);
    expect(result.approval_status).toBe("pending");
  });

  test("handles rejected status", () => {
    const row = {
      user_id: "user-3",
      name: "Charlie",
      username: "charlie",
      approval_status: "rejected",
      joined_at: new Date("2024-02-01T12:00:00Z"),
      is_owner: 0,
    };

    const result = formatMember(row);

    expect(result.approval_status).toBe("rejected");
  });
});
