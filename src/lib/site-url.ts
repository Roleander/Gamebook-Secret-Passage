export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://gamebook-secret-passage.vercel.app";

export function appUrl(path = ""): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    SITE_URL
  ).replace(/\/+$/, "");
  if (!path) return base;
  return base + (path.startsWith("/") ? path : `/${path}`);
}
