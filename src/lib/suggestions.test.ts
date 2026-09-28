import { describe, expect, it } from "vitest";
import {
  normalizeSuggestions,
  planBulkAccept,
  RawSuggestion,
} from "@/lib/suggestions";

function raw(
  sourceNumber: number,
  targetNumber: number,
  extra: Partial<RawSuggestion> = {}
): RawSuggestion {
  return { sourceNumber, targetNumber, ...extra };
}

describe("normalizeSuggestions", () => {
  it("keeps suggestions between existing passages", () => {
    const result = normalizeSuggestions([1, 2], [raw(1, 2, { type: "explicit", confidence: 0.9 })]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      sourceNumber: 1,
      targetNumber: 2,
      type: "explicit",
      text: null,
      confidence: 0.9,
    });
  });

  it("drops suggestions pointing to unknown passages", () => {
    const result = normalizeSuggestions([1, 2], [raw(1, 99), raw(99, 2)]);
    expect(result).toHaveLength(0);
  });

  it("drops self links", () => {
    expect(normalizeSuggestions([1], [raw(1, 1)])).toHaveLength(0);
  });

  it("deduplicates repeated pairs keeping the first", () => {
    const result = normalizeSuggestions(
      [1, 2],
      [raw(1, 2, { confidence: 0.8 }), raw(1, 2, { confidence: 0.2 })]
    );
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.8);
  });

  it("falls back to suggested for unknown types", () => {
    const result = normalizeSuggestions([1, 2], [raw(1, 2, { type: "weird" })]);
    expect(result[0].type).toBe("suggested");
  });

  it("clamps confidence into [0, 1] and defaults to 0", () => {
    const result = normalizeSuggestions(
      [1, 2, 3],
      [raw(1, 2, { confidence: 2 }), raw(2, 3, { confidence: -1 }), raw(3, 1)]
    );
    expect(result.map((r) => r.confidence)).toEqual([1, 0, 0]);
  });

  it("trims and caps link text", () => {
    const result = normalizeSuggestions(
      [1, 2],
      [raw(1, 2, { text: "  mira atrás  " }), raw(2, 1, { text: "x".repeat(300) })]
    );
    expect(result[0].text).toBe("mira atrás");
    expect(result[1].text).toHaveLength(120);
  });

  it("ignores non-integer numbers", () => {
    const result = normalizeSuggestions([1], [raw(1.5, 1), raw(1, NaN)]);
    expect(result).toHaveLength(0);
  });
});

describe("planBulkAccept", () => {
  const passages = new Map([
    [1, "p1"],
    [2, "p2"],
    [3, "p3"],
  ]);

  function pending(
    id: string,
    sourceNumber: number,
    targetNumber: number
  ) {
    return { id, sourceNumber, targetNumber };
  }

  it("creates links for resolvable suggestions and accepts them", () => {
    const plan = planBulkAccept(
      [pending("a", 1, 2), pending("b", 2, 3)],
      passages,
      new Set()
    );
    expect(plan.toCreate).toEqual([
      { sourceId: "p1", targetId: "p2", targetNumber: 2 },
      { sourceId: "p2", targetId: "p3", targetNumber: 3 },
    ]);
    expect(plan.toAcceptIds).toEqual(["a", "b"]);
    expect(plan.failedIds).toEqual([]);
  });

  it("fails suggestions whose passages no longer exist", () => {
    const plan = planBulkAccept(
      [pending("a", 1, 99), pending("b", 99, 2)],
      passages,
      new Set()
    );
    expect(plan.toCreate).toEqual([]);
    expect(plan.toAcceptIds).toEqual([]);
    expect(plan.failedIds).toEqual(["a", "b"]);
  });

  it("skips link creation for pairs that already exist but still accepts", () => {
    const plan = planBulkAccept(
      [pending("a", 1, 2)],
      passages,
      new Set(["p1:p2"])
    );
    expect(plan.toCreate).toEqual([]);
    expect(plan.toAcceptIds).toEqual(["a"]);
    expect(plan.failedIds).toEqual([]);
  });

  it("creates a pair only once when duplicated across suggestions", () => {
    const plan = planBulkAccept(
      [pending("a", 1, 2), pending("b", 1, 2)],
      passages,
      new Set()
    );
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toAcceptIds).toEqual(["a", "b"]);
  });

  it("fails self-pair suggestions defensively", () => {
    const plan = planBulkAccept([pending("a", 2, 2)], passages, new Set());
    expect(plan.failedIds).toEqual(["a"]);
    expect(plan.toCreate).toEqual([]);
  });
});
