import { describe, expect, it } from "vitest";
import { replaceNumberReferences } from "@/lib/number-references";

describe("replaceNumberReferences", () => {
  it("rewrites references matching the mapping", () => {
    expect(replaceNumberReferences("Ve al pasaje 12.", new Map([[12, 34]]))).toBe(
      "Ve al pasaje 34."
    );
  });

  it("supports plain Record mappings", () => {
    expect(replaceNumberReferences("pasa al 3", { 3: 7 })).toBe("pasa al 7");
  });

  it("does not rewrite partial numbers (word boundary)", () => {
    expect(replaceNumberReferences("pasaje 123 y 12", new Map([[12, 34]]))).toBe(
      "pasaje 123 y 34"
    );
  });

  it("replaces in a single pass so swaps do not collide", () => {
    expect(replaceNumberReferences("del 1 al 2", new Map([[1, 2], [2, 1]]))).toBe(
      "del 2 al 1"
    );
  });

  it("ignores identity mappings", () => {
    const content = "Ve al pasaje 5";
    expect(replaceNumberReferences(content, new Map([[5, 5]]))).toBe(content);
  });

  it("returns the input unchanged for empty mappings", () => {
    expect(replaceNumberReferences("texto 1", new Map())).toBe("texto 1");
  });

  it("handles overlapping prefixes (1 and 12)", () => {
    expect(replaceNumberReferences("al 1 y al 12", new Map([[1, 9], [12, 99]]))).toBe(
      "al 9 y al 99"
    );
  });

  it("rewrites references inside link text", () => {
    expect(
      replaceNumberReferences("[Ve al pasaje 42]", new Map([[42, 7]]))
    ).toBe("[Ve al pasaje 7]");
  });
});
