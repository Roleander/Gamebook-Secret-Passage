import { describe, expect, it } from "vitest";
import { normalizeSearchText, searchPassages, tokenizeQuery } from "@/lib/passage-search";

describe("passage-search", () => {
  it("normalizes accents and CASE", () => {
    expect(normalizeSearchText("ÁRBOL Causal")).toBe("arbol causal");
  });

  it("tokenizes multiple terms", () => {
    expect(tokenizeQuery("MorziA  a la torre")).toEqual(["morzia", "a", "la", "torre"]);
  });

  it("finds passages with snippet and score", () => {
    const result = searchPassages(
      [
        { id: "1", number: 12, title: "Prisión", content: "El grimorgo acecha en la mazmorra." },
        { id: "2", number: 34, title: "Torre", content: "Nada que ver aquí." },
      ],
      "grimorgo"
    );
    expect(result).toHaveLength(1);
    expect(result[0].passage.number).toBe(12);
    expect(result[0].snippet).toContain("grimorgo");
    expect(result[0].score).toBe(1);
  });

  it("requires all terms when several are given", () => {
    const result = searchPassages(
      [
        { id: "1", number: 12, content: "El grimorgo acecha." },
        { id: "2", number: 34, content: "grimorgo y torre." },
      ],
      "grimorgo torre"
    );
    expect(result.map((r) => r.passage.number)).toEqual([34]);
  });

  it("limits results", () => {
    const result = searchPassages(
      [
        { id: "1", number: 1, content: "x" },
        { id: "2", number: 2, content: "x" },
      ],
      "x",
      1
    );
    expect(result).toHaveLength(1);
  });
});
