import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_ORIGINS = new Set([
  "https://www.gamebooksecret.com",
  "https://gamebooksecret.com",
]);

const CORS_BASE: Record<string, string> = {
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const AUTH_RATE_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 };

function corsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return null;
  }
  return {
    ...CORS_BASE,
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthWrite =
    pathname.startsWith("/api/auth/") &&
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS";

  if (isAuthWrite) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip =
      (forwarded ? forwarded.split(",")[0] : "unknown").trim() || "unknown";
    const check = checkRateLimit(
      `auth:${ip}`,
      AUTH_RATE_LIMIT.limit,
      AUTH_RATE_LIMIT.windowMs
    );
    if (!check.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." },
        { status: 429, headers: { "Retry-After": String(check.retryAfterSeconds) } }
      );
    }
  }

  const cors = pathname.startsWith("/api/ext/")
    ? corsHeaders(req.headers.get("origin"))
    : null;

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors ?? undefined });
  }

  const res = NextResponse.next();
  if (cors) {
    for (const [key, value] of Object.entries(cors)) {
      res.headers.set(key, value);
    }
  }
  return res;
}

export const config = {
  matcher: ["/api/ext/:path*", "/api/auth/:path*"],
};
