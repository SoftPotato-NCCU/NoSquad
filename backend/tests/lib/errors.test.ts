import { expect, describe, test } from "bun:test";
import { apiError } from "../../src/lib/errors";

function mockContext() {
  return {
    json: (body: unknown, status: number) => new Response(JSON.stringify(body), { status }),
  };
}

describe("apiError", () => {
  test("returns error response with correct status and body", () => {
    const c = mockContext() as Parameters<typeof apiError>[0];
    const response = apiError(c, 400, "VALIDATION_ERROR", "Invalid request data");

    expect(response.status).toBe(400);
  });

  test("includes code and message in body", async () => {
    const c = mockContext() as Parameters<typeof apiError>[0];
    const response = apiError(c, 404, "NOT_FOUND", "Resource not found");
    const body = await response.json();

    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Resource not found",
        details: [],
      },
    });
  });

  test("includes details when provided", async () => {
    const c = mockContext() as Parameters<typeof apiError>[0];
    const details = [
      { field: "email", issue: "required", message: "Email is required" },
    ];
    const response = apiError(c, 400, "VALIDATION_ERROR", "Invalid request data", details);
    const body = await response.json();

    expect(body.error.details).toEqual(details);
  });

  test("returns empty details array by default", async () => {
    const c = mockContext() as Parameters<typeof apiError>[0];
    const response = apiError(c, 500, "SERVER_ERROR", "Internal error");
    const body = await response.json();

    expect(body.error.details).toEqual([]);
  });

  test("handles various status codes", async () => {
    const c = mockContext() as Parameters<typeof apiError>[0];

    const statuses = [400, 401, 403, 404, 409, 500, 501];
    for (const status of statuses) {
      const response = apiError(c, status as 400 | 401 | 403 | 404 | 409 | 500 | 501, "ERROR", "msg");
      expect(response.status).toBe(status);
    }
  });
});
