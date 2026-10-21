import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { generateEPUB } from "@/lib/exporters/epub";
import type { ThemeId } from "@/lib/exporters/themes";

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
  id: "test-epub",
  title: "EPUB anchors",
  passages: [
    passage({ number: 1, content: "Ve al 2", outgoingLinks: [{ target: { number: 2 }, linkText: "Seguir" }] }),
    passage({ number: 2, isEndpoint: true, content: "Vuelve al 1" }),
  ],
};

async function loadZip(theme?: ThemeId): Promise<JSZip> {
  const buf = await generateEPUB(project as any, false, theme ?? "clasico");
  return JSZip.loadAsync(buf);
}

describe("EPUB export (generateEPUB)", () => {
  it("los archivos de capitulo usan chapter{number} consistente con los enlaces", async () => {
    const zip = await loadZip();
    const names = Object.keys(zip.files);
    expect(names).toContain("OEBPS/chapter1.xhtml");
    expect(names).toContain("OEBPS/chapter2.xhtml");

    const ch1 = await zip.files["OEBPS/chapter1.xhtml"].async("string");
    expect(ch1).toContain('href="chapter2.xhtml"');

    const nav = await zip.files["OEBPS/nav.xhtml"].async("string");
    expect(nav).toContain('href="chapter1.xhtml"');
    expect(nav).toContain('href="chapter2.xhtml"');
  });

  it("el manifiesto declara cada pasaje con su numero de pasaje", async () => {
    const zip = await loadZip();
    const opf = await zip.files["OEBPS/content.opf"].async("string");
    expect(opf).toContain('id="chapter1" href="chapter1.xhtml"');
    expect(opf).toContain('id="chapter2" href="chapter2.xhtml"');
    expect(opf).toContain('idref="chapter1"');
    expect(opf).toContain('idref="chapter2"');
  });

  it("el tema clasico no embebe fuentes", async () => {
    const zip = await loadZip("clasico");
    const names = Object.keys(zip.files);
    expect(names.filter((n) => n.includes("fonts/"))).toEqual([]);
    const css = await zip.files["OEBPS/style.css"].async("string");
    expect(css).not.toContain("@font-face");
  });

  it("el tema grimorio embebe woff2 y aplica colores", async () => {
    const zip = await loadZip("grimorio");
    const names = Object.keys(zip.files);
    const fontFiles = names.filter((n) => n.startsWith("OEBPS/fonts/") && n.endsWith(".woff2"));
    expect(fontFiles.length).toBeGreaterThan(0);

    const opf = await zip.files["OEBPS/content.opf"].async("string");
    expect(opf).toContain('media-type="font/woff2"');

    const css = await zip.files["OEBPS/style.css"].async("string");
    expect(css).toContain("@font-face");
    expect(css).toContain("UnifrakturMaguntia");
    expect(css).toContain("#8b6914");
    expect(css).toContain("#2a1f14");
  });

  it("el tema papiro embebe Cinzel", async () => {
    const zip = await loadZip("papiro");
    const css = await zip.files["OEBPS/style.css"].async("string");
    expect(css).toContain("Cinzel");
    expect(css).toContain("text-transform: uppercase");
    const names = Object.keys(zip.files);
    expect(names.filter((n) => n.startsWith("OEBPS/fonts/")).length).toBeGreaterThan(0);
  });

  it("el tema clasico no lleva watermark ni divisores", async () => {
    const zip = await loadZip("clasico");
    const css = await zip.files["OEBPS/style.css"].async("string");
    expect(css).not.toContain("page-watermark");
    expect(css).not.toContain("passage-divider");
    const ch1 = await zip.files["OEBPS/chapter1.xhtml"].async("string");
    expect(ch1).not.toContain('class="page-watermark"');
  });

  it("grimorio lleva watermark inline SVG, divisor y lang=es por capitulo", async () => {
    const zip = await loadZip("grimorio");
    const ch1 = await zip.files["OEBPS/chapter1.xhtml"].async("string");
    expect(ch1).toContain('lang="es"');
    expect(ch1).toContain('xml:lang="es"');
    expect(ch1).toContain('<div class="page-watermark" aria-hidden="true">');
    expect(ch1).toContain("<svg");
    expect(ch1).toContain('<div class="passage-divider" aria-hidden="true">');

    const css = await zip.files["OEBPS/style.css"].async("string");
    expect(css).toContain("position: absolute");
    expect(css).toContain("pointer-events: none");
  });

  it("los 4 temas nuevos embeben sus fuentes y llevan watermark y divisor", async () => {
    const cases: Array<[ThemeId, string]> = [
      ["celta", "MedievalSharp"],
      ["cruzada", "UnifrakturCook"],
      ["renacentista", "Cinzel Decorative"],
      ["alquimia", "Pirata One"],
    ];
    for (const [theme, family] of cases) {
      const zip = await loadZip(theme);
      const names = Object.keys(zip.files);
      const fonts = names.filter((n) => n.startsWith("OEBPS/fonts/") && n.endsWith(".woff2"));
      expect(fonts.length, `${theme} fuentes`).toBeGreaterThan(0);

      const css = await zip.files["OEBPS/style.css"].async("string");
      expect(css, `${theme} @font-face`).toContain("@font-face");
      expect(css, `${theme} familia`).toContain(family);

      const ch1 = await zip.files["OEBPS/chapter1.xhtml"].async("string");
      expect(ch1, `${theme} watermark`).toContain('<div class="page-watermark" aria-hidden="true">');
      expect(ch1, `${theme} divisor`).toContain('<div class="passage-divider" aria-hidden="true">');
      expect(ch1, `${theme} lang`).toContain('lang="es"');
    }
  });
});
