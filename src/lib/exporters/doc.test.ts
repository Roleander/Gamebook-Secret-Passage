import { describe, expect, it } from "vitest";
import { buildDocHtml } from "@/lib/exporters/doc";

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

describe("DOC export (buildDocHtml)", () => {
  const project = {
    title: "Doc anchors",
    passages: [
      passage({ number: 1, content: "Ve al 2", outgoingLinks: [{ target: { number: 2 }, linkText: "Seguir" }] }),
      passage({ number: 2, isEndpoint: true, content: "Vuelve al 1" }),
    ],
  };

  it("usa anclas sin guion passageN (validas para bookmark de word)", () => {
    const html = buildDocHtml(project, false);
    expect(html).toContain('<a name="passage1" id="passage1">');
    expect(html).toContain('<a name="passage2" id="passage2">');
    expect(html).not.toMatch(/passage-\d/);
  });

  it("los enlaces apuntan a #passageN sin guion", () => {
    const html = buildDocHtml(project, false);
    expect(html).toContain('href="#passage2"');
    expect(html).toContain('href="#passage1"');
    expect(html).not.toMatch(/#passage-/);
  });

  it("en readingMode tambien ancla cada pasaje", () => {
    const html = buildDocHtml(project, true);
    expect(html).toContain('<a name="passage1" id="passage1">');
    expect(html).toContain('href="#passage2"');
  });

  it("escapa html hostil en titulo y contenido", () => {
    const html = buildDocHtml(
      { title: 'A & <t> "q"', passages: [passage({ number: 1, content: 'x & <y>' })] },
      false
    );
    expect(html).toContain("A &amp; &lt;t&gt; &quot;q&quot;");
    expect(html).toContain("x &amp; &lt;y&gt;");
  });

  it("el tema clasico no embebe fuentes ni cambia colores", () => {
    const html = buildDocHtml(project, false, "clasico");
    expect(html).not.toContain("@font-face");
    expect(html).toContain("#8b4513");
    expect(html).toContain("Georgia, 'Times New Roman', serif");
  });

  it("el tema grimorio aplica colores oscuros de acento y embebe TTF", () => {
    const html = buildDocHtml(project, false, "grimorio");
    expect(html).toContain("@font-face");
    expect(html).toContain("data:font/ttf;base64,");
    expect(html).toContain("UnifrakturMaguntia");
    expect(html).toContain("#8b6914");
    expect(html).toContain("#2a1f14");
    expect(html).toContain("EB Garamond");
  });

  it("el tema papiro aplica Cinzel y colores parchment", () => {
    const html = buildDocHtml(project, false, "papiro");
    expect(html).toContain("Cinzel");
    expect(html).toContain("text-transform: uppercase");
    expect(html).toContain("#6e5217");
  });

  it("el tema pergamino aplica IM Fell English", () => {
    const html = buildDocHtml(project, false, "pergamino");
    expect(html).toContain("IM Fell English");
    expect(html).toContain("#7a4a21");
  });
});
