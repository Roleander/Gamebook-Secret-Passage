import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    passage: { findMany: vi.fn() },
    passageLink: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { syncProjectLinks } from "@/lib/link-sync";

const findPassages = db.passage.findMany as ReturnType<typeof vi.fn>;
const findLinks = db.passageLink.findMany as ReturnType<typeof vi.fn>;
const createMany = db.passageLink.createMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  createMany.mockResolvedValue({ count: 0 });
});

describe("syncProjectLinks", () => {
  it("crea el enlace faltante detectado en el contenido", async () => {
    findPassages.mockResolvedValue([
      { id: "p1", number: 1, content: "Eliges el camino. Ve al 2." },
      { id: "p2", number: 2, content: "Llegas a la meta. FIN." },
    ]);
    findLinks.mockResolvedValue([]);

    const created = await syncProjectLinks("proj1");

    expect(created).toBe(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [{ sourceId: "p1", targetId: "p2", linkText: "Ve al 2" }],
    });
  });

  it("no duplica enlaces existentes", async () => {
    findPassages.mockResolvedValue([
      { id: "p1", number: 1, content: "Ve al 2." },
      { id: "p2", number: 2, content: "FIN." },
    ]);
    findLinks.mockResolvedValue([{ sourceId: "p1", targetId: "p2" }]);

    const created = await syncProjectLinks("proj1");

    expect(created).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("salta auto-referencias y numeros inexistentes", async () => {
    findPassages.mockResolvedValue([
      { id: "p1", number: 1, content: "Piensas: no vayas al 1. Ve al 99." },
      { id: "p2", number: 2, content: "FIN." },
    ]);
    findLinks.mockResolvedValue([]);

    const created = await syncProjectLinks("proj1");

    expect(created).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("devuelve 0 sin consultar enlaces si no hay pasajes", async () => {
    findPassages.mockResolvedValue([]);

    const created = await syncProjectLinks("proj1");

    expect(created).toBe(0);
    expect(findLinks).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("crea varios enlaces y respeta la deduplicacion por destino", async () => {
    findPassages.mockResolvedValue([
      { id: "p1", number: 1, content: "Ve al 3. Si dudas, ve al 3 otra vez." },
      { id: "p2", number: 2, content: "Nada que hacer. FIN." },
      { id: "p3", number: 3, content: "Continúas. → 2" },
    ]);
    findLinks.mockResolvedValue([]);

    const created = await syncProjectLinks("proj1");

    expect(created).toBe(2);
    const data = createMany.mock.calls[0][0].data;
    expect(data).toContainEqual(
      expect.objectContaining({ sourceId: "p1", targetId: "p3" })
    );
    expect(data).toContainEqual(
      expect.objectContaining({ sourceId: "p3", targetId: "p2" })
    );
    expect(
      data.filter(
        (l: { sourceId: string; targetId: string }) =>
          l.sourceId === "p1" && l.targetId === "p3"
      )
    ).toHaveLength(1);
  });
});
