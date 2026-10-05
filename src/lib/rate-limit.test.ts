import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows up to the limit within the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k1", 5, 60_000, now + i)).toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });
    }
  });

  it("blocks the request over the limit with a positive retry-after", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit("k2", 3, 60_000, now);
    const blocked = checkRateLimit("k2", 3, 60_000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("slides the window as old hits expire", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit("k3", 3, 60_000, now);
    expect(checkRateLimit("k3", 3, 60_000, now).allowed).toBe(false);
    expect(checkRateLimit("k3", 3, 60_000, now + 60_001).allowed).toBe(true);
  });

  it("keeps independent keys", () => {
    const now = 1_000_000;
    for (let i = 0; i < 2; i++) checkRateLimit("a", 2, 60_000, now);
    expect(checkRateLimit("a", 2, 60_000, now).allowed).toBe(false);
    expect(checkRateLimit("b", 2, 60_000, now).allowed).toBe(true);
  });

  it("resetRateLimits clears all keys", () => {
    const now = 1_000_000;
    for (let i = 0; i < 2; i++) checkRateLimit("c", 2, 60_000, now);
    expect(checkRateLimit("c", 2, 60_000, now).allowed).toBe(false);
    resetRateLimits();
    expect(checkRateLimit("c", 2, 60_000, now).allowed).toBe(true);
  });
});
