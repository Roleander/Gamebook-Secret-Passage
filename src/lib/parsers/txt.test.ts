import { describe, expect, it } from "vitest";
import {
  autoDetectLinks,
  detectLinksInPassage,
} from "@/lib/parsers/txt";

describe("detectLinksInPassage", () => {
  it("detects arrow, bracket and goto references", () => {
    const links = detectLinksInPassage(
      "sigue → 25 y (12) o [8]\n<<goto \"15\">>",
      [8, 12, 15, 25]
    );
    expect(links.map((l) => l.targetNumber).sort((a, b) => a - b)).toEqual([
      8, 12, 15, 25,
    ]);
  });

  it("detects references in other languages", () => {
    expect(
      detectLinksInPassage("Turn to 25 for the next chapter.", [25]).map(
        (l) => l.targetNumber
      )
    ).toEqual([25]);
    expect(
      detectLinksInPassage("Vai al passaggio 9.", [9]).map(
        (l) => l.targetNumber
      )
    ).toEqual([9]);
    expect(
      detectLinksInPassage("Allez au passage 7.", [7]).map(
        (l) => l.targetNumber
      )
    ).toEqual([7]);
  });

  it("does not detect mechanics as links", () => {
    expect(detectLinksInPassage("Pierdes 20 PV.", [20])).toEqual([]);
    expect(detectLinksInPassage("→ 20 PV.", [20])).toEqual([]);
    expect(detectLinksInPassage("del 1 al 2", [1, 2])).toEqual([]);
    expect(detectLinksInPassage("Nivel 7 te espera.", [7])).toEqual([]);
  });

  it("skips targets that do not exist", () => {
    expect(detectLinksInPassage("Ve al pasaje 40.", [1, 2])).toEqual([]);
  });

  it("deduplicates repeated targets", () => {
    const links = detectLinksInPassage("Ve al 5. Repite: → 5", [5]);
    expect(links).toHaveLength(1);
  });

  it("keeps twine goto targets", () => {
    expect(
      detectLinksInPassage('<<goto "La cueva 15">>', [15]).map(
        (l) => l.targetNumber
      )
    ).toEqual([15]);
    expect(detectLinksInPassage('<<goto "15 PV">>', [15])).toEqual([]);
  });
});

describe("autoDetectLinks", () => {
  it("maps detected references back to their source passages", () => {
    const links = autoDetectLinks([
      { number: 1, content: "Ve al pasaje 2." },
      { number: 2, content: "Pierdes 20 PV." },
    ]);
    expect(links).toEqual([
      { sourceNumber: 1, targetNumber: 2, text: "Ve al pasaje 2" },
    ]);
  });
});
