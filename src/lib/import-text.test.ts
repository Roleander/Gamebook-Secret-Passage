import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    passage: { findMany: vi.fn(), createMany: vi.fn() },
    passageLink: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { importParsedResult } from "@/lib/import-text";
import type { Entitlements } from "@/lib/entitlements";
import type { FileParseResult, ParsedPassage } from "@/lib/parsers";

const findPassages = db.passage.findMany as ReturnType<typeof vi.fn>;
const createMany = db.passage.createMany as ReturnType<typeof vi.fn>;
const findLink = db.passageLink.findUnique as ReturnType<typeof vi.fn>;
const createLink = db.passageLink.create as ReturnType<typeof vi.fn>;

const ENT: Entitlements = {
  userId: "u1",
  isAdmin: false,
  plan: "free",
  planDisplayName: "Gratis",
  isPro: false,
  maxProjects: 1,
  maxPassages: null,
  features: {
    exportTxt: true,
    exportAdvanced: false,
    autofix: false,
    analyze: false,
    shuffle: false,
  },
};

function makeResult(
  passages: ParsedPassage[],
  links: FileParseResult["links"] = []
): FileParseResult {
  return { passages, links, rawText: "", errors: [], warnings: [] };
}

function createdNumbers(): number[] {
  return createMany.mock.calls[0][0].data.map((p: { number: number }) => p.number);
}

function createdContents(): string[] {
  return createMany.mock.calls[0][0].data.map((p: { content: string }) => p.content);
}

beforeEach(() => {
  vi.clearAllMocks();
  createMany.mockResolvedValue({ count: 0 });
  createLink.mockResolvedValue({});
});

describe("importParsedResult — desplazamiento de números", () => {
  it("reescribe las referencias cuando el proyecto ya tiene pasajes", async () => {
    findPassages
      .mockResolvedValueOnce([{ number: 100 }])
      .mockResolvedValueOnce([
        { id: "p102", number: 102 },
        { id: "p103", number: 103 },
      ]);
    findLink.mockResolvedValue(null);

    const outcome = await importParsedResult(
      "proj1",
      makeResult(
        [
          { number: 1, content: "Ve al 2.", isStart: true, isEndpoint: false },
          { number: 2, content: "Fin.", isStart: false, isEndpoint: true },
        ],
        [{ sourceNumber: 1, targetNumber: 2, text: "Ve al 2" }]
      ),
      ENT
    );

    expect(createdNumbers()).toEqual([102, 103]);
    expect(createdContents()[0]).toBe("Ve al 103.");
    expect(outcome.createdCount).toBe(2);
    expect(outcome.linksCreated).toBe(1);
    expect(createLink).toHaveBeenCalledWith({
      data: { sourceId: "p102", targetId: "p103", linkText: "Ve al 2" },
    });
  });

  it("deja el contenido intacto en un proyecto vacío", async () => {
    findPassages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "p1", number: 1 },
        { id: "p2", number: 2 },
      ]);
    findLink.mockResolvedValue(null);

    const outcome = await importParsedResult(
      "proj1",
      makeResult(
        [
          { number: 1, content: "Ve al 2.", isStart: true, isEndpoint: false },
          { number: 2, content: "Fin.", isStart: false, isEndpoint: true },
        ],
        [{ sourceNumber: 1, targetNumber: 2, text: "Ve al 2" }]
      ),
      ENT
    );

    expect(createdNumbers()).toEqual([1, 2]);
    expect(createdContents()[0]).toBe("Ve al 2.");
    expect(outcome.linksCreated).toBe(1);
  });

  it("omite números no enteros con aviso", async () => {
    findPassages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "p1", number: 1 }]);

    const outcome = await importParsedResult(
      "proj1",
      makeResult([
        { number: 1, content: "Uno.", isStart: true, isEndpoint: true },
        { number: 7.5, content: "Raro.", isStart: false, isEndpoint: false },
      ]),
      ENT
    );

    expect(createdNumbers()).toEqual([1]);
    expect(outcome.warnings.some((w) => w.includes("no entero"))).toBe(true);
  });
});

describe("importParsedResult — enlaces", () => {
  it("no crea enlaces fantasma 'Continuar' automáticos", async () => {
    findPassages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "p1", number: 1 },
        { id: "p2", number: 2 },
      ]);

    const outcome = await importParsedResult(
      "proj1",
      makeResult([
        {
          number: 1,
          content: "Eliges.",
          isStart: true,
          isEndpoint: false,
          options: [
            { text: "Acción A", type: "action" },
            { text: "Acción B", type: "action" },
          ],
        },
        { number: 2, content: "Fin.", isStart: false, isEndpoint: true },
      ]),
      ENT
    );

    expect(outcome.linksCreated).toBe(0);
    expect(createLink).not.toHaveBeenCalled();
    expect(findLink).not.toHaveBeenCalled();
  });

  it("renumera un duplicado interno con aviso en lugar de descartarlo", async () => {
    findPassages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "p5", number: 5 },
        { id: "p6", number: 6 },
      ]);

    const outcome = await importParsedResult(
      "proj1",
      makeResult([
        { number: 5, content: "Primera versión.", isStart: true, isEndpoint: false },
        { number: 5, content: "Segunda versión.", isStart: false, isEndpoint: true },
      ]),
      ENT
    );

    expect(createdNumbers()).toEqual([5, 6]);
    expect(
      outcome.warnings.some((w) => w.includes("duplicado") && w.includes("6"))
    ).toBe(true);
  });
});
