import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    passage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    passageLink: { create: vi.fn() },
  },
}));

vi.mock("@/lib/snapshots", () => ({
  createProjectSnapshot: vi.fn().mockResolvedValue({ id: "snap1" }),
}));

import { db } from "@/lib/db";
import { replaceProjectPassages } from "@/lib/passages-replace";

const deleteMany = db.passage.deleteMany as ReturnType<typeof vi.fn>;
const createMany = db.passage.createMany as ReturnType<typeof vi.fn>;
const findMany = db.passage.findMany as ReturnType<typeof vi.fn>;
const createLink = db.passageLink.create as ReturnType<typeof vi.fn>;

function createdData(): { number: number; content: string; isStart: boolean }[] {
  return createMany.mock.calls[0][0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteMany.mockResolvedValue({});
  createMany.mockResolvedValue({ count: 0 });
  findMany.mockResolvedValue([]);
  createLink.mockResolvedValue({});
});

describe("replaceProjectPassages — numeración de segmentos", () => {
  it("respeta los numeros originales de los segmentos", async () => {
    const result = await replaceProjectPassages(
      "p1",
      [
        { title: null, content: "Fallas el lanzamiento.", number: 45 },
        { title: null, content: "Una terrible descarga.", number: 17 },
        { title: null, content: "Sin numero asignado." },
      ],
      [],
      "Aplicar Detección"
    );

    expect(result.passageCount).toBe(3);
    expect(createdData().map((p) => p.number)).toEqual([45, 17, 3]);
    expect(createdData()[0].isStart).toBe(true);
  });

  it("reasigna numeros duplicados sin colisionar", async () => {
    await replaceProjectPassages(
      "p1",
      [
        { content: "A", number: 5 },
        { content: "B", number: 5 },
        { content: "C", number: 3 },
      ],
      [],
      "Aplicar Detección"
    );

    expect(createdData().map((p) => p.number)).toEqual([5, 6, 3]);
  });

  it("numeracion secuencial cuando nadie pasa numero", async () => {
    await replaceProjectPassages(
      "p1",
      [{ content: "Uno" }, { content: "Dos" }],
      [],
      "Importación"
    );

    expect(createdData().map((p) => p.number)).toEqual([1, 2]);
    expect(createdData()[1].isStart).toBe(false);
  });
});
