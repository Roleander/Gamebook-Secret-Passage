import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { pdfExportLog: { count: vi.fn(), create: vi.fn() } },
}));

import { db } from "@/lib/db";
import { getPdfExportLimit, getPdfExportUsage, recordPdfExport } from "@/lib/pdf-quota";

const count = db.pdfExportLog.count as ReturnType<typeof vi.fn>;
const create = db.pdfExportLog.create as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("PDF_EXPORT_MONTHLY_LIMIT", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("pdf-quota", () => {
  it("limit por defecto 1000 si la variable no esta o es invalida", () => {
    expect(getPdfExportLimit()).toBe(1000);
    vi.stubEnv("PDF_EXPORT_MONTHLY_LIMIT", "abc");
    expect(getPdfExportLimit()).toBe(1000);
    vi.stubEnv("PDF_EXPORT_MONTHLY_LIMIT", "-5");
    expect(getPdfExportLimit()).toBe(1000);
  });

  it("lee el limite de PDF_EXPORT_MONTHLY_LIMIT", () => {
    vi.stubEnv("PDF_EXPORT_MONTHLY_LIMIT", "500");
    expect(getPdfExportLimit()).toBe(500);
  });

  it("permite exportar por debajo del limite", async () => {
    count.mockResolvedValue(499);
    const usage = await getPdfExportUsage();
    expect(usage).toEqual({ used: 499, limit: 1000, allowed: true });
    expect(count).toHaveBeenCalledTimes(1);
  });

  it("bloquea al alcanzar el limite", async () => {
    count.mockResolvedValue(1000);
    const usage = await getPdfExportUsage();
    expect(usage.allowed).toBe(false);
  });

  it("registra cada export exitoso", async () => {
    create.mockResolvedValue({});
    await recordPdfExport();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
