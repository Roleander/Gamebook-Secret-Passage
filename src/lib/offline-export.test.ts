import { describe, expect, it } from "vitest";
import { safeFilename, snapshotToJSON, snapshotToMarkdown } from "@/lib/offline-export";
import { toOfflineSnapshot } from "@/lib/offline-snapshot";

const snapshot = toOfflineSnapshot(
  {
    id: "p1",
    title: "Aventura",
    description: "Una prueba",
    passages: [
      {
        number: 1,
        title: "Inicio",
        content: "Todo empieza aquí.",
        isStart: true,
        outgoingLinks: [
          { target: { number: 2 }, targetId: "b", linkText: "Seguir" },
          { target: { number: 3 }, targetId: "c", linkText: null },
        ],
      },
      { number: 2, content: "Segundo pasaje.", outgoingLinks: [] },
      {
        number: 3,
        title: "Otro",
        content: "Tercero.",
        isEndpoint: true,
        outgoingLinks: [{ target: { number: 1 }, targetId: "a" }],
      },
    ],
  },
  "2026-01-01T00:00:00.000Z"
);

describe("snapshotToJSON", () => {
  it("round-trips through parse", () => {
    const parsed = JSON.parse(snapshotToJSON(snapshot));
    expect(parsed.title).toBe("Aventura");
    expect(parsed.passages).toHaveLength(3);
    expect(parsed.passages[0].links[0]).toEqual({
      targetNumber: 2,
      linkText: "Seguir",
      condition: null,
    });
    expect(parsed.savedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("snapshotToMarkdown", () => {
  const md = snapshotToMarkdown(snapshot);

  it("separates passages with a blank line and titles with #", () => {
    const blocks = md.split("\n\n");
    expect(blocks).toHaveLength(3);
    expect(blocks[0].startsWith("# Inicio")).toBe(true);
    expect(md).not.toContain("\n\n\n");
  });

  it("writes link markers with 1-based passage positions", () => {
    expect(md).toContain("→ Seguir [[1-2]]");
    expect(md).toContain("→ Pasaje 3 [[1-3]]");
    expect(md).toContain("→ Pasaje 1 [[3-1]]");
  });

  it("omits markers for self-links and unknown targets", () => {
    const snap = toOfflineSnapshot({
      id: "x",
      title: "t",
      passages: [
        {
          number: 1,
          content: "a",
          outgoingLinks: [
            { target: { number: 1 } },
            { target: { number: 99 } },
          ],
        },
        { number: 2, content: "b" },
      ],
    });
    const out = snapshotToMarkdown(snap);
    expect(out).not.toContain("[[");
  });

  it("writes passages without a title as plain blocks", () => {
    const snap = toOfflineSnapshot({
      id: "x",
      title: "t",
      passages: [{ number: 1, content: "solo contenido" }],
    });
    expect(snapshotToMarkdown(snap)).toBe("solo contenido");
  });
});

describe("safeFilename", () => {
  it("strips forbidden characters and defaults", () => {
    expect(safeFilename("Mi: libro?")).toBe("Mi libro");
    expect(safeFilename("###")).toBe("gamebook");
  });
});
