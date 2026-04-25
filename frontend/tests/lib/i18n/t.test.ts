import { describe, it, expect } from "vitest";
import { t } from "../../../lib/i18n/useDictionary";

describe("t() - translation function", () => {
  const mockDict = {
    auth: {
      login: {
        title: "Login to NoSquad",
        form: {
          submit: "Login",
        },
      },
      signup: {
        errors: {
          nameRequired: "Please enter your name",
        },
      },
    },
    common: {
      loading: "Loading...",
      error: "An error occurred",
    },
  };

  it("returns translation for valid nested key", () => {
    expect(t(mockDict, "auth.login.title", "Fallback")).toBe(
      "Login to NoSquad",
    );
  });

  it("returns translation for deeply nested key", () => {
    expect(t(mockDict, "auth.login.form.submit", "Fallback")).toBe("Login");
  });

  it("returns fallback for invalid key", () => {
    expect(t(mockDict, "auth.login.invalid", "Fallback")).toBe("Fallback");
  });

  it("returns fallback for non-existent root key", () => {
    expect(t(mockDict, "nonexistent.key", "Fallback")).toBe("Fallback");
  });

  it("returns fallback when dict is null", () => {
    expect(t(null, "any.key", "Fallback")).toBe("Fallback");
  });

  it("returns fallback when dict is undefined", () => {
    expect(t(undefined, "any.key", "Fallback")).toBe("Fallback");
  });

  it("returns fallback when value is not a string", () => {
    const dictWithObject = {
      auth: { login: { form: { submit: { text: "Login" } } } },
    };
    expect(t(dictWithObject, "auth.login.form.submit", "Fallback")).toBe(
      "Fallback",
    );
  });

  it("uses empty string fallback by default", () => {
    expect(t(mockDict, "nonexistent.key")).toBe("");
  });

  it("handles empty string as valid translation", () => {
    const dictWithEmpty = { auth: { title: "" } };
    expect(t(dictWithEmpty, "auth.title", "Fallback")).toBe("");
  });
});
