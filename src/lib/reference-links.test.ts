import { describe, expect, it } from "vitest";
import { findPassageLinks } from "@/lib/reference-links";

describe("findPassageLinks", () => {
  const numbers = new Set([1, 3, 12, 20]);

  it("links only confident references", () => {
    const links = findPassageLinks(
      "Pierdes 20 PV. Ve al 3 y pasa al 12.",
      numbers
    );
    expect(links.map((l) => l.target)).toEqual([3, 12]);
  });

  it("returns exact offsets for each link", () => {
    const content = "Ve al 3.";
    const links = findPassageLinks(content, numbers);
    expect(links).toHaveLength(1);
    expect(content.slice(links[0].start, links[0].end)).toBe("3");
    expect(links[0].target).toBe(3);
  });

  it("excludes the current passage number", () => {
    expect(findPassageLinks("Ve al 3.", numbers, 3)).toEqual([]);
    expect(findPassageLinks("Ve al 12.", numbers, 3)).toHaveLength(1);
  });

  it("links bracketed and arrow references", () => {
    expect(
      findPassageLinks("elige (12) o → 3", numbers).map((l) => l.target)
    ).toEqual([12, 3]);
  });

  it("skips ambiguous bare numbers", () => {
    expect(findPassageLinks("Ganas 7 y sigues", new Set([7]))).toEqual([]);
  });

  it("never links decimals or thousands", () => {
    expect(
      findPassageLinks("Tira 1.000 y 3,5", new Set([1, 3, 1000]))
    ).toEqual([]);
  });

  it("skips numbers outside the passage set", () => {
    expect(findPassageLinks("Pierdes 99 PV", numbers)).toEqual([]);
  });
});
