import { describe, expect, it } from "vitest";
import {
  buildContentShufflePlan,
  rewriteShuffledContent,
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
