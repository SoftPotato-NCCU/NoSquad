import { describe, it, expect, beforeEach, vi } from "vitest";
import { getToken, setToken, clearToken } from "../../lib/api";

const AUTH_ERROR_CODES = [
  "UNAUTHORIZED",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "USER_NOT_FOUND",
];

function isAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "code" in error.error &&
    typeof error.error.code === "string" &&
    AUTH_ERROR_CODES.includes(error.error.code)
  );
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})() as unknown as Storage;

describe("api.ts", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
    });
  });

  describe("isAuthError", () => {
    it("returns true for UNAUTHORIZED error", () => {
      const error = {
        error: { code: "UNAUTHORIZED", message: "Token missing" },
      };
      expect(isAuthError(error)).toBe(true);
    });

    it("returns true for INVALID_TOKEN error", () => {
      const error = {
        error: { code: "INVALID_TOKEN", message: "Invalid token" },
      };
      expect(isAuthError(error)).toBe(true);
    });

    it("returns true for TOKEN_EXPIRED error", () => {
      const error = {
        error: { code: "TOKEN_EXPIRED", message: "Token expired" },
      };
      expect(isAuthError(error)).toBe(true);
    });

    it("returns true for USER_NOT_FOUND error", () => {
      const error = {
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      };
      expect(isAuthError(error)).toBe(true);
    });

    it("returns false for non-auth error", () => {
      const error = {
        error: { code: "VALIDATION_ERROR", message: "Invalid data" },
      };
      expect(isAuthError(error)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isAuthError(null)).toBe(false);
    });

    it("returns false for plain error without code", () => {
      expect(isAuthError(new Error("some error"))).toBe(false);
    });

    it("returns false for object without error property", () => {
      expect(isAuthError({ message: "hello" })).toBe(false);
    });
  });

  describe("getToken", () => {
    it("returns token from localStorage", () => {
      localStorageMock.setItem("access_token", "test-token-123");
      expect(getToken()).toBe("test-token-123");
    });

    it("returns null when no token exists", () => {
      expect(getToken()).toBeNull();
    });

    it("returns null on server-side (no window)", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - intentionally removing window to test SSR behavior
      delete globalThis.window;
      expect(getToken()).toBeNull();
      globalThis.window = originalWindow;
    });
  });

  describe("setToken", () => {
    it("sets token in localStorage", () => {
      setToken("new-token-456");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "access_token",
        "new-token-456",
      );
    });

    it("does nothing on server-side", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - intentionally removing window to test SSR behavior
      delete globalThis.window;
      expect(() => setToken("token")).not.toThrow();
      globalThis.window = originalWindow;
    });
  });

  describe("clearToken", () => {
    it("removes token from localStorage", () => {
      localStorageMock.setItem("access_token", "test-token");
      clearToken();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("access_token");
    });

    it("does nothing when no token exists", () => {
      expect(() => clearToken()).not.toThrow();
    });
  });
});
