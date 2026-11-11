import { describe, expect, it } from "vitest";
import {
  exportableLinks,
  exportableTargets,
  findPassageLinks,
  findPassageLinksPerLine,
  isLinkInsideDocument,
} from "@/lib/reference-links";

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

  it("force-links ambiguous numbers when they are in forcedTargets", () => {
    expect(
      findPassageLinks("Mira el 12 otra vez", numbers, undefined, new Set([12])).map(
        (l) => l.target
      )
    ).toEqual([12]);
  });

  it("does not force-link not-reference numbers even in forcedTargets", () => {
    expect(
      findPassageLinks("Pierdes 12 PV", numbers, undefined, new Set([12]))
    ).toEqual([]);
  });

  it("still respects excludeNumber when using forcedTargets", () => {
    expect(
      findPassageLinks("Mira el 3", numbers, 3, new Set([3]))
    ).toEqual([]);
  });
});

describe("findPassageLinksPerLine", () => {
  it("recorta los enlaces que cruzan saltos de linea", () => {
    const numbers = new Set([121]);
    const perLine = findPassageLinksPerLine("Ve al\n121.", numbers);
    expect(perLine).toHaveLength(2);
    expect(perLine[0]).toEqual([]);
    expect(perLine[1]).toHaveLength(1);
    expect(perLine[1][0]).toMatchObject({
      target: 121,
      text: "121",
      start: 0,
      end: 3,
    });
  });

  it("devuelve los mismos objetivos que la deteccion completa", () => {
    const numbers = new Set([5, 7]);
    const content = "Ve al 5.\n\nLuego ve al 7.";
    const flat = findPassageLinks(content, numbers);
    const perLine = findPassageLinksPerLine(content, numbers);
    expect(perLine.flat().map((l) => l.target)).toEqual(
      flat.map((l) => l.target)
    );
    expect(perLine.flat()).toHaveLength(2);
  });

  it("aplica exclude y forced igual que findPassageLinks", () => {
    const numbers = new Set([5, 7]);
    expect(findPassageLinksPerLine("Mira el 5", numbers, 5)).toEqual([[]]);
    expect(
      findPassageLinksPerLine("Mira el 5", numbers, undefined, new Set([5]))[0]
    ).toHaveLength(1);
  });
});

describe("isLinkInsideDocument", () => {
  const passageIds = new Set(["p1", "p2"]);

  it("acepta enlaces internos y rechaza destinos de otro proyecto", () => {
    expect(
      isLinkInsideDocument({ targetId: "p2", target: { number: 2 } }, passageIds)
    ).toBe(true);
    expect(
      isLinkInsideDocument(
        { targetId: "otro-proyecto", target: { number: 2 } },
        passageIds
      )
    ).toBe(false);
  });

  it("acepta enlaces sin targetId (datos antiguos o enlaces por número)", () => {
    expect(isLinkInsideDocument({ target: { number: 2 } }, passageIds)).toBe(
      true
    );
  });

  it("rechaza autollenlaces y destinos sin número válido", () => {
    expect(
      isLinkInsideDocument({ targetId: "p1", target: { number: 1 } }, passageIds, 1)
    ).toBe(false);
    expect(
      isLinkInsideDocument({
        targetId: "p2",
        target: { number: Number.NaN },
      })
    ).toBe(false);
  });
});

describe("exportableLinks", () => {
  it("filtra enlaces externos, autollenlaces y números duplicados", () => {
    const links = [
      { targetId: "p2", target: { number: 2 }, linkText: "Interno" },
      { targetId: "externo", target: { number: 2 }, linkText: "Ajeno" },
      { targetId: "p1", target: { number: 1 }, linkText: "Yo mismo" },
      { targetId: "p2b", target: { number: 2 }, linkText: "Duplicado" },
    ];

    const result = exportableLinks(links, new Set(["p1", "p2", "p2b"]), 1);

    expect(result).toEqual([links[0]]);
    expect(
      exportableTargets(
        [links[0], { targetId: "externo", target: { number: 3 } }],
        new Set(["p1", "p2"]),
        1
      )
    ).toEqual(new Set([2]));
  });
});
