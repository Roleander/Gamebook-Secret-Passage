import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const AUTH_RATE_LIMIT = { limit: 10, windowMs: 5 * 60 * 1000 };

export function proxy(req: NextRequest) {
  const isWrite = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";

  if (isWrite && req.nextUrl.pathname.startsWith("/api/auth/")) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : "unknown").trim() || "unknown";
    const check = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.windowMs);
    if (!check.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos y vuelve a intentarlo." },
        { status: 429, headers: { "Retry-After": String(check.retryAfterSeconds) } }
      );
    }
  }

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: ["/api/ext/:path*", "/api/auth/:path*"],
};
