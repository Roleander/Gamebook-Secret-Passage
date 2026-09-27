import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: vi.fn() } } }));

import { EXT_TOKEN_TTL_DAYS, signExtToken, verifyExtToken } from "@/lib/ext-auth";

const SECRET = "test-secret";

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.NEXTAUTH_SECRET;
});

describe("signExtToken / verifyExtToken", () => {
  it("round-trips a token to the same user", () => {
    const signed = signExtToken("user_123");
    expect(signed).not.toBeNull();
    if (!signed) return;

    const verified = verifyExtToken(signed.token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user_123");
  });

  it("expires ~30 days in the future", () => {
    const signed = signExtToken("user_123");
    if (!signed) throw new Error("signExtToken returned null");

    const verified = verifyExtToken(signed.token);
    expect(verified).not.toBeNull();

    const ttlDays = (verified!.expiresAt - Date.now()) / (24 * 60 * 60 * 1000);
    expect(EXT_TOKEN_TTL_DAYS).toBe(30);
    expect(ttlDays).toBeGreaterThan(29.9);
    expect(ttlDays).toBeLessThanOrEqual(30);
    expect(signed.expiresAt).toBe(new Date(verified!.expiresAt).toISOString());
  });

  it("rejects tampered tokens", () => {
    const signed = signExtToken("user_123");
    if (!signed) throw new Error("signExtToken returned null");

    const [payload, signature] = signed.token.split(".");
    const tamperedPayload = Buffer.from(
      `${Date.now() + 60_000}.attacker`
    ).toString("base64url");

    expect(verifyExtToken(`${tamperedPayload}.${signature}`)).toBeNull();
    expect(verifyExtToken(`${payload}.${signature.slice(0, -1)}x`)).toBeNull();
    expect(verifyExtToken("not-a-token")).toBeNull();
    expect(verifyExtToken("")).toBeNull();
  });

  it("rejects expired tokens", () => {
    const past = Date.now() - 1000;
    const payload = Buffer.from(`${past}.user_123`).toString("base64url");
    const signature = createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url");

    expect(verifyExtToken(`${payload}.${signature}`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const payload = Buffer.from(`${Date.now() + 60_000}.user_123`).toString("base64url");
    const signature = createHmac("sha256", "other-secret")
      .update(payload)
      .digest("base64url");

    expect(verifyExtToken(`${payload}.${signature}`)).toBeNull();
  });

  it("returns null when NEXTAUTH_SECRET is not configured", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(signExtToken("user_123")).toBeNull();
    expect(verifyExtToken("anything")).toBeNull();
  });

  it("returns null for empty user ids", () => {
    expect(signExtToken("")).toBeNull();
  });
});
