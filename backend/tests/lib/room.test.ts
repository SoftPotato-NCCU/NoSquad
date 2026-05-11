import { expect, describe, test } from "bun:test";

describe("room formatters", () => {
  const { formatMyRoom, formatHallRoom } = require("../../src/routes/v1/rooms");

  describe("formatMyRoom", () => {
    test("is_owner true when user is creator", () => {
      const row = {
        uuid: "room-1",
        title: "Test Room",
        description: "A test room",
        creator_id: "user-creator",
        member_count: 5,
        max_members: 10,
        created_at: new Date("2024-01-01T00:00:00Z"),
      };

      const result = formatMyRoom(row, "user-creator");

      expect(result.is_owner).toBe(true);
    });

    test("is_owner false when user is not creator", () => {
      const row = {
        uuid: "room-1",
        title: "Test Room",
        description: "A test room",
        creator_id: "user-creator",
        member_count: 5,
        max_members: 10,
        created_at: new Date("2024-01-01T00:00:00Z"),
      };

      const result = formatMyRoom(row, "user-other");

      expect(result.is_owner).toBe(false);
    });

    test("returns correct shape", () => {
      const row = {
        uuid: "room-123",
        title: "My Room",
        description: "Description here",
        status: "recruiting_closed",
        creator_id: "creator",
        member_count: 3,
        max_members: 10,
        event_time: new Date("2030-06-20T14:00:00Z"),
        event_end_time: new Date("2030-06-20T16:00:00Z"),
        created_at: new Date("2024-06-15T10:30:00Z"),
        membership_status: "approved",
      };

      const result = formatMyRoom(row, "other-user");

      expect(result).toEqual({
        id: "room-123",
        name: "My Room",
        description: "Description here",
        room_status: "recruiting_closed",
        member_count: 3,
        max_capacity: 10,
        join_approval_required: false,
        event_time: "2030-06-20T14:00:00.000Z",
        event_end_time: "2030-06-20T16:00:00.000Z",
        created_at: "2024-06-15T10:30:00.000Z",
        is_owner: false,
        membership_status: "approved",
      });
    });

    test("handles null description", () => {
      const row = {
        uuid: "room-1",
        title: "Room",
        description: null,
        creator_id: "creator",
        member_count: 1,
        max_members: 5,
        created_at: new Date(),
      };

      const result = formatMyRoom(row, "other");

      expect(result.description).toBeNull();
    });
  });

  describe("formatHallRoom", () => {
    test("is_full true when at capacity", () => {
      const row = {
        uuid: "room-1",
        title: "Full Room",
        description: null,
        member_count: 10,
        max_members: 10,
        is_joined: 0,
        created_at: new Date(),
      };

      const result = formatHallRoom(row);

      expect(result.is_full).toBe(true);
    });

    test("is_full false when not at capacity", () => {
      const row = {
        uuid: "room-1",
        title: "Open Room",
        description: null,
        member_count: 5,
        max_members: 10,
        is_joined: 0,
        created_at: new Date(),
      };

      const result = formatHallRoom(row);

      expect(result.is_full).toBe(false);
    });

    test("is_joined true when user is member", () => {
      const row = {
        uuid: "room-1",
        title: "Room",
        description: null,
        member_count: 3,
        max_members: 10,
        is_joined: 1,
        created_at: new Date(),
      };

      const result = formatHallRoom(row);

      expect(result.is_joined).toBe(true);
    });

    test("is_joined false when user is not member", () => {
      const row = {
        uuid: "room-1",
        title: "Room",
        description: null,
        member_count: 3,
        max_members: 10,
        is_joined: 0,
        created_at: new Date(),
      };

      const result = formatHallRoom(row);

      expect(result.is_joined).toBe(false);
    });

    test("returns correct shape", () => {
      const row = {
        uuid: "hall-room-1",
        title: "Hall Room",
        description: "Public room",
        status: "open",
        member_count: 7,
        max_members: 20,
        is_joined: 1,
        event_time: new Date("2030-03-20T10:00:00Z"),
        created_at: new Date("2024-03-20T08:00:00Z"),
      };

      const result = formatHallRoom(row);

      expect(result).toEqual({
        id: "hall-room-1",
        name: "Hall Room",
        description: "Public room",
        room_status: "open",
        member_count: 7,
        max_capacity: 20,
        join_approval_required: false,
        created_at: "2024-03-20T08:00:00.000Z",
        is_joined: true,
        is_full: false,
      });
    });
  });
});
