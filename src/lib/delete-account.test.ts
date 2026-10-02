import { describe, expect, it } from "vitest";

import { confirmEmailMatches } from "@/lib/delete-account";

describe("confirmEmailMatches", () => {
  it("matches the exact account email", () => {
    expect(confirmEmailMatches("user@example.com", "user@example.com")).toBe(true);
  });

  it("trims whitespace and ignores case", () => {
    expect(confirmEmailMatches("  User@Example.COM ", "user@example.com")).toBe(true);
  });

  it("rejects a different email", () => {
    expect(confirmEmailMatches("other@example.com", "user@example.com")).toBe(false);
  });

  it("rejects empty or blank input", () => {
    expect(confirmEmailMatches("", "user@example.com")).toBe(false);
    expect(confirmEmailMatches("   ", "user@example.com")).toBe(false);
  });
});
