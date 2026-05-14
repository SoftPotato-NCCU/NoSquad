import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "../../lib/push-notifications";

describe("urlBase64ToUint8Array", () => {
  it("returns an ArrayBuffer", () => {
    const result = urlBase64ToUint8Array("AA");
    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it("decodes base64url string without special chars", () => {
    const input = "SGVsbG8gV29ybGQ"; // "Hello World" without padding
    const result = urlBase64ToUint8Array(input);
    const view = new Uint8Array(result);
    const decoded = String.fromCharCode(...view);
    expect(decoded).toBe("Hello World");
  });

  it("handles padding correctly", () => {
    const input = "AQIDBAUG"; // base64 for bytes [1,2,3,4,5,6]
    const result = urlBase64ToUint8Array(input);
    const view = new Uint8Array(result);
    expect(Array.from(view)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("replaces - with + and _ with /", () => {
    const input = "_-A"; // base64url with both special chars
    const result = urlBase64ToUint8Array(input);
    const view = new Uint8Array(result);
    expect(view[0]).toBe(255);
    expect(view[1]).toBe(224);
  });
});
