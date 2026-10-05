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
    expect(replaceNumberReferences("ve al 1 o al 2", new Map([[1, 2], [2, 1]]))).toBe(
      "ve al 2 o al 1"
    );
  });

  it("leaves ranges untouched", () => {
    expect(replaceNumberReferences("del 1 al 2", new Map([[1, 2], [2, 1]]))).toBe(
      "del 1 al 2"
    );
    expect(replaceNumberReferences("nivel 1-10", new Map([[1, 9]]))).toBe(
      "nivel 1-10"
    );
  });

  it("does not rewrite game mechanics or units", () => {
    expect(replaceNumberReferences("Pierdes 20 PV.", new Map([[20, 99]]))).toBe(
      "Pierdes 20 PV."
    );
    expect(replaceNumberReferences("al 50 XP", new Map([[50, 5]]))).toBe(
      "al 50 XP"
    );
    expect(replaceNumberReferences("cuesta 30 monedas", new Map([[30, 3]]))).toBe(
      "cuesta 30 monedas"
    );
    expect(replaceNumberReferences("pierdes 20 PV y ganas 5", new Map([[20, 99], [5, 7]]))).toBe(
      "pierdes 20 PV y ganas 5"
    );
  });

  it("does not rewrite decimals or thousands", () => {
    expect(replaceNumberReferences("tira 3,5", new Map([[3, 7]]))).toBe("tira 3,5");
    expect(replaceNumberReferences("1.000 monedas", new Map([[1, 7]]))).toBe(
      "1.000 monedas"
    );
  });

  it("rewrites references in other languages", () => {
    expect(replaceNumberReferences("Turn to 25.", new Map([[25, 7]]))).toBe(
      "Turn to 7."
    );
    expect(replaceNumberReferences("Vai al passaggio 9", new Map([[9, 4]]))).toBe(
      "Vai al passaggio 4"
    );
    expect(replaceNumberReferences("Continue to passage 3", new Map([[3, 8]]))).toBe(
      "Continue to passage 8"
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
