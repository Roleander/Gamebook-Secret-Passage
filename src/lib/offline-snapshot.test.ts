import { describe, expect, it } from "vitest";
import {
  findPassage,
  startPassageNumber,
  toOfflineSnapshot,
} from "@/lib/offline-snapshot";

const input = {
  id: "p1",
  title: "Mi libro",
  description: "desc",
  passages: [
    {
      number: 3,
      title: "Final",
      content: "Fin.",
      isEndpoint: true,
      outgoingLinks: [],
    },
    {
      number: 1,
      title: null,
      content: "Empiezas aquí.",
      isStart: true,
      outgoingLinks: [
        {
          targetId: "b",
          target: { number: 2 },
          linkText: "Ve al pasaje 2",
          condition: null,
        },
      ],
    },
    {
      number: 2,
      content: "Segundo.",
      outgoingLinks: [
        { targetId: "c", target: { number: 3 } },
        { targetId: "missing", target: { number: 99 }, linkText: null },
      ],
    },
  ],
};

describe("toOfflineSnapshot", () => {
  const snap = toOfflineSnapshot(input, "2026-01-01T00:00:00.000Z");

  it("sorts passages by number", () => {
    expect(snap.passages.map((p) => p.number)).toEqual([1, 2, 3]);
  });

  it("keeps metadata and savedAt", () => {
    expect(snap.id).toBe("p1");
    expect(snap.title).toBe("Mi libro");
    expect(snap.description).toBe("desc");
    expect(snap.savedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("maps links to target numbers with labels", () => {
    const first = snap.passages[0];
    expect(first.links).toEqual([
      { targetNumber: 2, linkText: "Ve al pasaje 2", condition: null },
    ]);
    const second = snap.passages[1];
    expect(second.links).toEqual([
      { targetNumber: 3, linkText: null, condition: null },
      { targetNumber: 99, linkText: null, condition: null },
    ]);
  });

  it("normalizes flags and missing fields", () => {
    expect(snap.passages[0].isStart).toBe(true);
    expect(snap.passages[0].isEndpoint).toBe(false);
    expect(snap.passages[1].title).toBeNull();
    expect(snap.passages[2].isEndpoint).toBe(true);
  });
});

describe("startPassageNumber", () => {
  it("prefers the start passage", () => {
    const snap = toOfflineSnapshot(input);
    expect(startPassageNumber(snap)).toBe(1);
  });

  it("falls back to the lowest number", () => {
    const snap = toOfflineSnapshot({
      id: "x",
      title: "t",
      passages: [
        { number: 4, content: "a" },
        { number: 2, content: "b" },
      ],
    });
    expect(startPassageNumber(snap)).toBe(2);
  });

  it("returns null for an empty project", () => {
    const snap = toOfflineSnapshot({ id: "x", title: "t", passages: [] });
    expect(startPassageNumber(snap)).toBeNull();
  });
});

describe("findPassage", () => {
  it("finds by number", () => {
    const snap = toOfflineSnapshot(input);
    expect(findPassage(snap, 2)?.content).toBe("Segundo.");
    expect(findPassage(snap, 42)).toBeNull();
  });
});
