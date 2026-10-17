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

  it("el tema clasico (por defecto) mantiene el CSS y los enlaces inline originales", () => {
    const html = buildPrintHtml(project, false);
    expect(buildPrintHtml(project, false, "clasico")).toBe(html);
    expect(html).toContain("background: #f5f0e8;");
    expect(html).toContain(
      ".container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }"
    );
    expect(html).toContain(
      ".cover h1 { font-size: 32px; color: #8b4513; margin-bottom: 10px; letter-spacing: 2px; }"
    );
    expect(html).toContain("@media print { body { background: white; padding: 0; }");
    expect(html).toContain(
      'style="color:#8b4513;text-decoration:none;border-bottom:1px dotted #c9a96e"'
    );
    expect(html).not.toContain("@font-face");
    expect(html).not.toContain("background-image");
    expect(html).not.toContain("cover-ornament");
    expect(html).not.toContain("::first-letter");
  });

  it("los temas tematizados conservan anclas, enlaces y aplican su estilo", () => {
    const html = buildPrintHtml(project, false, "grimorio");
    expect(html).toContain('<div class="passage-content" id="passage1">');
    expect(html).toContain('href="#passage2"');
    expect(html).not.toMatch(/id="passage-/);
    expect(html).toContain("@font-face");
    expect(html).toContain("data:font/woff2;base64,");
    expect(html).toContain("UnifrakturMaguntia");
    expect(html).toContain("cover-ornament");
    expect(html).toContain("::first-letter");
    expect(html).toContain(
      'style="color:#c9a96e;text-decoration:none;border-bottom:1px dotted #c9a96e"'
    );
    expect(html).toContain("background: #14100c;");
    expect(html).toContain("background-image:");

    const papiro = buildPrintHtml(project, true, "papiro");
    expect(papiro).toContain('<div class="passage-content" id="passage1">');
    expect(papiro).toContain('href="#passage2"');
    expect(papiro).toContain("Cinzel");
    expect(papiro).toContain("text-transform: uppercase");
    expect(papiro).toContain('style="color:#6e5217;');

    const pergamino = buildPrintHtml(project, false, "pergamino");
    expect(pergamino).toContain("IM Fell English");
    expect(pergamino).toContain("::first-letter");
    expect(pergamino).toContain('<div class="passage-content" id="passage2">');
    expect(pergamino).toContain('href="#passage1"');
  });
});
