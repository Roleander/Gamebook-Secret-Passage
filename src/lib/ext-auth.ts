import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const EXT_TOKEN_TTL_DAYS = 30;

function getSecret(): string | null {
  return process.env.NEXTAUTH_SECRET || null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function signExtToken(userId: string): { token: string; expiresAt: string } | null {
  const secret = getSecret();
  if (!secret || !userId) return null;

  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = base64url(`${expiresAt}.${userId}`);
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export function verifyExtToken(token: string): { userId: string; expiresAt: number } | null {
  const secret = getSecret();
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const dotIndex = decoded.indexOf(".");
  if (dotIndex <= 0) return null;

  const expiresAt = Number(decoded.slice(0, dotIndex));
  const userId = decoded.slice(dotIndex + 1);
  if (!Number.isFinite(expiresAt) || !userId) return null;
  if (expiresAt < Date.now()) return null;

  return { userId, expiresAt };
}

export async function resolveExtAuth(
  req: Request
): Promise<{ userId: string; role: string | null } | null> {
  const header = req.headers.get("authorization");
  if (header && header.startsWith("Bearer ")) {
    const verified = verifyExtToken(header.slice(7).trim());
    if (verified) {
      const user = await db.user.findUnique({
        where: { id: verified.userId },
        select: { role: true },
      });
      if (user) return { userId: verified.userId, role: user.role };
      return null;
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { userId: session.user.id, role: session.user.role ?? null };
  }
  return null;
}
