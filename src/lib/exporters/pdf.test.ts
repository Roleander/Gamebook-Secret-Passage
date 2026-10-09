import { describe, expect, it } from "vitest";
import { buildPrintHtml } from "@/lib/exporters/pdf";

interface TestPassage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isEndpoint: boolean;
  outgoingLinks: { target: { number: number }; linkText: string | null }[];
}

function passage(overrides: Partial<TestPassage> = {}): TestPassage {
  return {
    id: "p1",
    number: 1,
    title: null,
    content: "",
    isEndpoint: false,
    outgoingLinks: [],
    ...overrides,
  };
}

const project = {
  title: "Print anchors",
  passages: [
    passage({ number: 1, content: "Ve al 2", outgoingLinks: [{ target: { number: 2 }, linkText: "Seguir" }] }),
    passage({ number: 2, isEndpoint: true, content: "Vuelve al 1" }),
  ],
};

describe("PDF print export (buildPrintHtml)", () => {
  it("cada pasaje tiene id passageN sin guion en el div de contenido (tras la cabecera)", () => {
    const html = buildPrintHtml(project, false);
    expect(html).toContain('<div class="passage-content" id="passage1">');
    expect(html).toContain('<div class="passage-content" id="passage2">');
    expect(html).not.toMatch(/id="passage-/);
    expect(html).not.toMatch(/<div class="passage" id=/);
  });

  it("los enlaces internos usan #passageN sin guion", () => {
    const html = buildPrintHtml(project, false);
    expect(html).toContain('href="#passage2"');
    expect(html).toContain('href="#passage1"');
    expect(html).not.toMatch(/#passage-/);
  });

  it("en readingMode tambien ancla cada tras su cabecera", () => {
    const html = buildPrintHtml(project, true);
    expect(html).toContain('<div class="passage-content" id="passage1">');
    expect(html).toContain('href="#passage2"');
  });

  it("el div de contenido tiene scroll-margin-top solo en pantalla (no altera el PDF)", () => {
    const html = buildPrintHtml(project, false);
    expect(html).toContain("@media screen { .passage-content { scroll-margin-top: 36px; } }");
    expect(html).not.toContain("pre-wrap; scroll-margin-top");
  });
});
