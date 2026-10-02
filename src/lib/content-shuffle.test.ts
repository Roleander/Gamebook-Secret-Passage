import { describe, expect, it } from "vitest";
import {
  buildContentShufflePlan,
  rewriteShuffledContent,
  computeShuffleMutations,
} from "@/lib/content-shuffle";

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function makePassages(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    isStart: i === 0,
  }));
}

describe("buildContentShufflePlan", () => {
  it("keeps the start story in its slot", () => {
    const plan = buildContentShufflePlan(makePassages(5), {
      rng: seededRng(42),
    });
    expect(plan.startStory).toBe(1);
    expect(plan.storyToSlot.get(1)).toBe(1);
    expect(plan.slotToStory.get(1)).toBe(1);
  });

  it("produces a bijection between stories and slots", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const plan = buildContentShufflePlan(makePassages(7), {
        rng: seededRng(seed),
      });
      expect(plan.storyToSlot.size).toBe(7);
      expect(plan.slotToStory.size).toBe(7);
      for (const [story, slot] of plan.storyToSlot) {
        expect(plan.slotToStory.get(slot)).toBe(story);
      }
      const storySlots = [...plan.storyToSlot.values()].sort((a, b) => a - b);
      expect(storySlots).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it("never moves pool stories into the start slot", () => {
    const plan = buildContentShufflePlan(makePassages(6), {
      rng: seededRng(7),
    });
    for (const [story, slot] of plan.storyToSlot) {
      if (story !== 1) expect(slot).not.toBe(1);
    }
  });

  it("is the identity when the rng never swaps", () => {
    const plan = buildContentShufflePlan(makePassages(5), {
      rng: () => 0.9999,
    });
    for (let n = 1; n <= 5; n++) {
      expect(plan.storyToSlot.get(n)).toBe(n);
    }
    expect(rewriteShuffledContent("Ve al pasaje 4.", plan)).toBe(
      "Ve al pasaje 4."
    );
  });

  it("includes the start story in the pool when preserveStart is false", () => {
    const plan = buildContentShufflePlan(makePassages(5), {
      preserveStart: false,
      rng: seededRng(11),
    });
    expect(plan.startStory).toBeNull();
    expect(plan.storyToSlot.size).toBe(5);
  });

  it("regression: a 3-cycle maps to where each story landed", () => {
    // Fisher-Yates over [1,2,3] with rng calls 0.5 then 0.1 yields order [3,1,2]:
    // story3→slot1, story1→slot2, story2→slot3 (the inverse would be wrong).
    const plan = buildContentShufflePlan(makePassages(3), {
      preserveStart: false,
      rng: sequenceRng([0.5, 0.1]),
    });
    expect(plan.storyToSlot.get(3)).toBe(1);
    expect(plan.storyToSlot.get(1)).toBe(2);
    expect(plan.storyToSlot.get(2)).toBe(3);
  });

  it("keeps numbers, start slot and link targets coherent across 20 shuffles", () => {
    const n = 12;
    const links: Array<[number, number]> = [
      [1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [4, 7], [5, 8],
      [6, 9], [7, 10], [8, 11], [9, 12], [10, 12], [11, 3], [12, 1],
    ];
    let changed = 0;

    for (let seed = 1; seed <= 20; seed++) {
      const plan = buildContentShufflePlan(makePassages(n), {
        rng: seededRng(seed),
      });

      const slots = [...plan.storyToSlot.values()].sort((a, b) => a - b);
      expect(slots).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      expect(plan.storyToSlot.get(1)).toBe(1);
      expect(plan.slotToStory.get(1)).toBe(1);

      let identity = true;
      for (let story = 1; story <= n; story++) {
        if (plan.storyToSlot.get(story) !== story) identity = false;
      }
      if (!identity) changed++;

      for (const [source, target] of links) {
        const mappedSource = plan.storyToSlot.get(source) ?? -1;
        const mappedTarget = plan.storyToSlot.get(target) ?? -1;
        expect(mappedSource).toBeGreaterThanOrEqual(1);
        expect(mappedSource).toBeLessThanOrEqual(n);
        expect(mappedTarget).toBeGreaterThanOrEqual(1);
        expect(mappedTarget).toBeLessThanOrEqual(n);
        expect(mappedSource).not.toBe(mappedTarget);
        expect(rewriteShuffledContent(`Ve al pasaje ${target}.`, plan)).toBe(
          `Ve al pasaje ${mappedTarget}.`
        );
      }
    }

    expect(changed).toBeGreaterThanOrEqual(18);
  });
});

describe("rewriteShuffledContent", () => {
  it("points every reference at the slot where the target story landed", () => {
    const plan = buildContentShufflePlan(makePassages(4), {
      rng: seededRng(99),
    });
    for (const target of [1, 2, 3, 4]) {
      const input = `Ve al pasaje ${target}.`;
      const expected = `Ve al pasaje ${plan.storyToSlot.get(target)}.`;
      expect(rewriteShuffledContent(input, plan)).toBe(expected);
    }
  });

  it("rewrites all references in one pass without cascading", () => {
    const plan = buildContentShufflePlan(makePassages(3), {
      rng: sequenceRng([0.1, 0.9]),
    });
    expect(rewriteShuffledContent("Opción al 1 y al 2.", plan)).toBe(
      `Opción al ${plan.storyToSlot.get(1)} y al ${plan.storyToSlot.get(2)}.`
    );
  });

  it("leaves numbers outside the plan untouched", () => {
    const plan = buildContentShufflePlan(makePassages(3), {
      rng: seededRng(5),
    });
    expect(rewriteShuffledContent("Año 2026, daño 404.", plan)).toBe(
      "Año 2026, daño 404."
    );
  });

  it("keeps self-references of the start story stable", () => {
    const plan = buildContentShufflePlan(makePassages(5), {
      rng: seededRng(3),
    });
    expect(rewriteShuffledContent("Vuelves al pasaje 1.", plan)).toBe(
      "Vuelves al pasaje 1."
    );
  });
});

function makeMutationPassages() {
  return [
    {
      id: "p1",
      number: 1,
      title: "Inicio",
      content: "Empiezas. Ve al pasaje 2.",
      isEndpoint: false,
      outgoingLinks: [
        { targetId: "p2", linkText: "Ve al 2", condition: "tesoro == 1" },
      ],
    },
    {
      id: "p2",
      number: 2,
      title: "Camino",
      content: "Un camino.",
      isEndpoint: true,
      outgoingLinks: [],
    },
    {
      id: "p3",
      number: 3,
      title: "Bosque",
      content: "Un bosque.",
      isEndpoint: false,
      outgoingLinks: [],
    },
  ];
}

describe("computeShuffleMutations", () => {
  it("moves titles and endpoints with their stories and rewrites content", () => {
    const passages = makeMutationPassages();
    const plan = buildContentShufflePlan(passages, {
      preserveStart: false,
      rng: sequenceRng([0.5, 0.1]),
    });
    expect(plan.storyToSlot.get(3)).toBe(1);
    expect(plan.storyToSlot.get(1)).toBe(2);
    expect(plan.storyToSlot.get(2)).toBe(3);

    const { passageUpdates, newLinks } = computeShuffleMutations(
      passages,
      plan
    );

    expect(passageUpdates).toEqual([
      { id: "p1", content: "Un bosque.", title: "Bosque", isEndpoint: false },
      {
        id: "p2",
        content: "Empiezas. Ve al pasaje 3.",
        title: "Inicio",
        isEndpoint: false,
      },
      { id: "p3", content: "Un camino.", title: "Camino", isEndpoint: true },
    ]);
    expect(newLinks).toEqual([
      {
        sourceId: "p2",
        targetId: "p3",
        linkText: "Ve al 3",
        condition: "tesoro == 1",
      },
    ]);
  });

  it("updates same-slot passages with content only, without title or endpoint", () => {
    const passages = [
      {
        id: "p1",
        number: 1,
        title: "Inicio",
        content: "Ve al pasaje 2.",
        isEndpoint: false,
        outgoingLinks: [],
      },
      {
        id: "p2",
        number: 2,
        title: "Camino",
        content: "Un camino.",
        isEndpoint: false,
        outgoingLinks: [],
      },
      {
        id: "p3",
        number: 3,
        title: "Bosque",
        content: "Un bosque.",
        isEndpoint: true,
        outgoingLinks: [],
      },
    ];
    const plan = buildContentShufflePlan(
      passages.map((p, i) => ({ number: p.number, isStart: i === 0 })),
      { rng: sequenceRng([0]) }
    );
    expect(plan.storyToSlot.get(1)).toBe(1);
    expect(plan.storyToSlot.get(3)).toBe(2);
    expect(plan.storyToSlot.get(2)).toBe(3);

    const { passageUpdates, newLinks } = computeShuffleMutations(
      passages,
      plan
    );

    expect(passageUpdates).toHaveLength(3);
    const startUpdate = passageUpdates.find((u) => u.id === "p1");
    expect(startUpdate).toEqual({ id: "p1", content: "Ve al pasaje 3." });
    expect(startUpdate).not.toHaveProperty("title");
    expect(startUpdate).not.toHaveProperty("isEndpoint");
    expect(passageUpdates).toContainEqual({
      id: "p2",
      content: "Un bosque.",
      title: "Bosque",
      isEndpoint: true,
    });
    expect(passageUpdates).toContainEqual({
      id: "p3",
      content: "Un camino.",
      title: "Camino",
      isEndpoint: false,
    });
    expect(newLinks).toEqual([]);
  });

  it("skips self-links and links to passages outside the project", () => {
    const passages = [
      {
        id: "p1",
        number: 1,
        title: "Inicio",
        content: "Hola.",
        isEndpoint: false,
        outgoingLinks: [
          { targetId: "p1", linkText: "A sí mismo", condition: null },
          { targetId: "missing", linkText: "Fuera", condition: null },
        ],
      },
      ...makeMutationPassages().slice(1),
    ];
    const plan = buildContentShufflePlan(passages, { rng: seededRng(8) });

    const { newLinks } = computeShuffleMutations(passages, plan);

    expect(newLinks).toEqual([]);
  });

  it("recreates links unchanged for an identity shuffle", () => {
    const passages = Array.from({ length: 4 }, (_, i) => ({
      id: `p${i + 1}`,
      number: i + 1,
      title: `T${i + 1}`,
      content: `Contenido ${i + 1}.`,
      isEndpoint: false,
      outgoingLinks:
        i < 3
          ? [{ targetId: `p${i + 2}`, linkText: "Siguiente", condition: null }]
          : [],
    }));
    const plan = buildContentShufflePlan(passages, { rng: () => 0.9999 });

    const { passageUpdates, newLinks } = computeShuffleMutations(
      passages,
      plan
    );

    expect(passageUpdates).toEqual([]);
    expect(newLinks).toEqual([
      { sourceId: "p1", targetId: "p2", linkText: "Siguiente", condition: null },
      { sourceId: "p2", targetId: "p3", linkText: "Siguiente", condition: null },
      { sourceId: "p3", targetId: "p4", linkText: "Siguiente", condition: null },
    ]);
  });
});
