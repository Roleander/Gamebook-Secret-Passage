import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl } from "@/lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appUrl", () => {
  it("prefers NEXT_PUBLIC_APP_URL over NEXTAUTH_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nuevo-dominio.com");
    vi.stubEnv("NEXTAUTH_URL", "https://old-domain.com");
    expect(appUrl("/auth/reset-password?token=abc")).toBe(
      "https://nuevo-dominio.com/auth/reset-password?token=abc"
    );
  });

  it("falls back to NEXTAUTH_URL (dev localhost)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000/");
    expect(appUrl("auth/reset-password")).toBe(
      "http://localhost:3000/auth/reset-password"
    );
  });

  it("returns the base without trailing slash when path is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://x.com/");
    expect(appUrl()).toBe("https://x.com");
  });
});
