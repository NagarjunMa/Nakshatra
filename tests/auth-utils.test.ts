import { describe, expect, it } from "vitest";
import { isAuthError } from "../src/lib/auth-utils";

describe("isAuthError", () => {
  it.each(["PGRST301", "PGRST302", "42501"])("recognizes auth code %s", (code) => {
    expect(isAuthError({ code })).toBe(true);
  });

  it.each(["JWT expired", "token missing", "Not Authenticated"])(
    "recognizes auth message %s",
    (message) => expect(isAuthError({ message })).toBe(true)
  );

  it("rejects null and unrelated errors", () => {
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError({ code: "500", message: "database unavailable" })).toBe(false);
    expect(isAuthError({})).toBe(false);
  });
});
