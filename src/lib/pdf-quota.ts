import { db } from "@/lib/db";

const DEFAULT_LIMIT = 1000;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function getPdfExportLimit(): number {
  const raw = process.env.PDF_EXPORT_MONTHLY_LIMIT;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
}

export async function getPdfExportUsage(): Promise<{
  used: number;
  limit: number;
  allowed: boolean;
}> {
  const since = new Date(Date.now() - WINDOW_MS);
  const used = await db.pdfExportLog.count({ where: { createdAt: { gte: since } } });
  const limit = getPdfExportLimit();
  return { used, limit, allowed: used < limit };
}

export async function recordPdfExport(): Promise<void> {
  await db.pdfExportLog.create({ data: {} });
}
