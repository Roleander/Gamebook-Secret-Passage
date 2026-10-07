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
});
