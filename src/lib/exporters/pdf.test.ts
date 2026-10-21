import { describe, expect, it } from "vitest";
import { buildPrintHtml } from "@/lib/exporters/pdf";
import { THEME_IDS } from "@/lib/exporters/themes";

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
    expect(html).not.toContain("background-image:");

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

  it("el espaciado entre pasajes es fluido: margen corto y sin page-break-inside", () => {
    const html = buildPrintHtml(project, false);
    expect(html).toContain(".passage { margin-bottom: 14px; }");
    expect(html).not.toContain("padding-bottom: 20px");
    expect(html).not.toContain("page-break-inside");
    expect(html).toContain(
      "@media print { body { background: white; padding: 0; } .container { box-shadow: none; padding: 0; } }"
    );
  });

  it("protege titulares, orfas y la caja de opciones de cortes en bordes de pagina", () => {
    const html = buildPrintHtml(project, false);
    expect(html).toContain("margin-bottom: 8px; break-after: avoid;");
    expect(html).toContain("orphans: 2; widows: 2;");
    expect(html).toContain("break-inside: avoid;");
    expect(html).toContain(".cover { text-align: center; padding: 80px 20px; border-bottom: 3px double #8b4513; margin-bottom: 40px; break-after: page; }");

    const reading = buildPrintHtml(project, true, "grimorio");
    expect(reading).toContain("break-after: avoid;");
    expect(reading).toContain("break-after: page;");
    expect(reading).toContain("orphans: 2; widows: 2;");
    expect(reading).not.toContain("page-break-inside");
  });

  it("el contenido se renderiza sin bordes en blanco pero conserva la indentacion interna", () => {
    const trimProject = {
      title: "Trim",
      passages: [passage({ number: 1, content: "\n\nHola\n\n" })],
    };
    const html = buildPrintHtml(trimProject, false);
    expect(html).toContain('<div class="passage-content" id="passage1">Hola</div>');
    expect(html).not.toMatch(/id="passage1">\s/);
    expect(html).not.toMatch(/Hola\s+<\/div>/);

    const indentProject = {
      title: "Indent",
      passages: [passage({ number: 1, content: "\n  sangria\n  dos lineas\n" })],
    };
    const indented = buildPrintHtml(indentProject, true);
    expect(indented).toContain('<div class="passage-content" id="passage1">  sangria\n  dos lineas</div>');
  });

  it("enlaza numeros ambiguos que el editor ya tiene como outgoingLink", () => {
    const linkProject = {
      title: "Ambiguous forced",
      passages: [
        passage({
          number: 1,
          content: "Ganas 12 y sigues.",
          outgoingLinks: [{ target: { number: 12 }, linkText: "Seguir" }],
        }),
        passage({ number: 12, content: "Fin." }),
      ],
    };
    const html = buildPrintHtml(linkProject, false);
    expect(html).toContain('href="#passage12"');
  });

  it("el tema clasico no lleva watermark, filete ni divisores", () => {
    const html = buildPrintHtml(project, false, "clasico");
    expect(html).not.toContain("page-watermark");
    expect(html).not.toContain("passage-divider");
    expect(html).not.toContain("outline-offset");
    expect(html).not.toContain("cover-emblem");
  });

  it("grimorio lleva watermark fixed, filete doble, divisor y capitular rubricada", () => {
    const html = buildPrintHtml(project, false, "grimorio");
    expect(html).toContain('<div class="page-watermark" aria-hidden="true">');
    expect(html).toContain("position: fixed");
    expect(html).toContain("pointer-events: none");
    expect(html).toContain("outline-offset: 3px");
    expect(html).toContain('<div class="passage-divider" aria-hidden="true">');
    expect(html).toContain("hyphens: auto");
    expect(html).toContain("::first-letter");
    const dividerCount = (html.match(/passage-divider/g) || []).length;
    expect(dividerCount).toBe(3);
  });

  it("papiro lleva small-caps y watermark, pergamino capitular y rubricacion", () => {
    const papiro = buildPrintHtml(project, false, "papiro");
    expect(papiro).toContain("font-variant: small-caps");
    expect(papiro).toContain('<div class="page-watermark" aria-hidden="true">');
    expect(papiro).not.toContain("::first-letter");

    const pergamino = buildPrintHtml(project, false, "pergamino");
    expect(pergamino).toContain("::first-letter");
    expect(pergamino).toContain('<div class="page-watermark" aria-hidden="true">');
    expect(pergamino).toContain("outline-offset: 3px");
  });

  it("el watermark usa SVG inline sin feTurbulence ni data:image", () => {
    for (const theme of THEME_IDS.filter((t) => t !== "clasico")) {
      const html = buildPrintHtml(project, false, theme);
      expect(html, theme).not.toContain("feTurbulence");
      expect(html, theme).not.toContain("data:image");
      expect(html, theme).toContain("<svg");
      expect(html, theme).toContain('<div class="page-watermark" aria-hidden="true">');
      expect(html, theme).toContain('<div class="passage-divider"');
      expect(html, theme).toContain("outline-offset: 3px");
      const wmIdx = html.indexOf('<div class="page-watermark"');
      const containerIdx = html.indexOf('<div class="container">');
      const closeIdx = html.indexOf("</div>\n</body>");
      expect(wmIdx, `${theme} watermark dentro del container`).toBeGreaterThan(containerIdx);
      expect(wmIdx, `${theme} watermark antes del cierre`).toBeLessThan(closeIdx);
    }
  });

  it("los temas nuevos renderizan capitulares, rubricacion y versalitas segun corresponde", () => {
    const celta = buildPrintHtml(project, false, "celta");
    expect(celta).toContain("::first-letter");
    expect(celta).not.toContain(".start-marker { color: #4a6741; }");

    const cruzada = buildPrintHtml(project, false, "cruzada");
    expect(cruzada).toContain("::first-letter");
    expect(cruzada).toContain(".start-marker { color: #a01c1c; }");

    const renacentista = buildPrintHtml(project, false, "renacentista");
    expect(renacentista).toContain("font-variant: small-caps");
    expect(renacentista).not.toContain("::first-letter");

    const alquimia = buildPrintHtml(project, false, "alquimia");
    expect(alquimia).toContain("::first-letter");
    expect(alquimia).toContain("#12141a");
  });
});
