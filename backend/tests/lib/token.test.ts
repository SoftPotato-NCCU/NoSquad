import { expect, describe, test } from "bun:test";
import { generateToken } from "../../src/lib/token";

describe("generateToken", () => {
  test("returns a string", () => {
    const token = generateToken();
    expect(typeof token).toBe("string");
  });

  test("returns a 64-character hex string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  test("returns unique tokens on each call", () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });
});
