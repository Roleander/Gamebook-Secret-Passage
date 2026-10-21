import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  PDF_THEMES,
  THEME_IDS,
  THEME_SWATCH,
  isThemeId,
  officeTheme,
  pdfThemeRules,
  pvThemeCss,
} from "@/lib/exporters/themes";
import { FONTS_DATA } from "@/lib/exporters/fonts-data";
import { FONTS_TTF_DATA } from "@/lib/exporters/fonts-ttf-data";
import { FONT_FILES } from "@/lib/exporters/font-files";

describe("planes de estilo de impresión", () => {
  it("el tema clasico conserva exactamente la paleta y tipografías originales", () => {
    const th = PDF_THEMES.clasico;
    expect(th.bg).toBe("#f5f0e8");
    expect(th.containerBg).toBe("white");
    expect(th.containerShadow).toBe("0 0 20px rgba(0,0,0,0.1)");
    expect(th.printBg).toBe("white");
    expect(th.text).toBe("#1a1410");
    expect(th.subtitle).toBe("#666");
    expect(th.accent).toBe("#8b4513");
    expect(th.linksBg).toBe("#faf8f5");
    expect(th.linksBorder).toBe("#e0d5c5");
    expect(th.linkInline).toBe("#8b4513");
    expect(th.linkDotted).toBe("#c9a96e");
    expect(th.fontBody).toBe("Georgia, 'Times New Roman', serif");
    expect(th.fontHeading).toBe("Georgia, 'Times New Roman', serif");
    expect(th.h1LetterSpacing).toBe("2px");
    expect(th.fontFamilies).toEqual([]);
    expect(pdfThemeRules(th)).toBe("");
    expect(pvThemeCss("clasico")).toBe("");
    expect(DEFAULT_THEME).toBe("clasico");
  });

  it("todos los temas definen campos completos y swatch", () => {
    for (const id of THEME_IDS) {
      const th = PDF_THEMES[id];
      expect(th.id).toBe(id);
      expect(th.bg).toMatch(/^#[0-9a-f]{3,8}$/i);
      expect(th.containerBg.length).toBeGreaterThan(0);
      expect(th.fontBody.length).toBeGreaterThan(0);
      expect(th.fontHeading.length).toBeGreaterThan(0);
      expect(THEME_SWATCH[id]).toMatch(/^#[0-9a-f]{3,8}$/i);
      if (id !== "clasico") {
        expect(th.fontFamilies.length).toBeGreaterThan(0);
        expect(pdfThemeRules(th).length).toBeGreaterThan(0);
        const css = pvThemeCss(id);
        expect(css).toContain(`data-pv-theme="${id}"`);
        expect(css).toContain("/fonts/");
        expect(css).toContain("@font-face");
      }
    }
  });

  it("los temas no clasicos definen textura, ornamento o capitular", () => {
    expect(PDF_THEMES.grimorio.dropCap).toBe(true);
    expect(PDF_THEMES.grimorio.ornament).toBe(true);
    expect(PDF_THEMES.papiro.ornament).toBe(true);
    expect(PDF_THEMES.papiro.uppercaseHeadings).toBe(true);
    expect(PDF_THEMES.papiro.dropCap).toBe(false);
    expect(PDF_THEMES.pergamino.dropCap).toBe(true);

    for (const id of THEME_IDS.filter((t) => t !== "clasico")) {
      const th = PDF_THEMES[id];
      expect(th.bodyTexture.length, `${id} bodyTexture`).toBeGreaterThan(0);
      expect(th.containerTexture.length, `${id} containerTexture`).toBeGreaterThan(0);
      expect(th.printBg).toBe(th.bg);
      expect(pdfThemeRules(th)).not.toContain("feTurbulence");
      expect(pdfThemeRules(th)).not.toContain("data:image");
    }
  });

  it("los temas no clasicos definen watermark SVG, filete y divisor", () => {
    for (const id of THEME_IDS.filter((t) => t !== "clasico")) {
      const th = PDF_THEMES[id];
      expect(th.watermarkSvg, `${id} watermarkSvg`).toBeTruthy();
      expect(th.watermarkSvg).toContain("<svg");
      expect(th.watermarkOpacity).toBeGreaterThan(0);
      expect(th.watermarkOpacity).toBeLessThanOrEqual(0.1);
      expect(th.dividerSvg).toContain("<svg");
      expect(th.pageFrame).toBe(true);
      const rules = pdfThemeRules(th);
      expect(rules).toContain("page-watermark");
      expect(rules).toContain("passage-divider");
      expect(rules).toContain("outline-offset: 3px");
    }
    expect(PDF_THEMES.clasico.watermarkSvg).toBeUndefined();
    expect(PDF_THEMES.clasico.dividerSvg).toBeUndefined();
    expect(PDF_THEMES.clasico.pageFrame).toBeUndefined();
  });

  it("papiro usa small-caps y grimorio/pergamino/cruzada rubricacion", () => {
    expect(PDF_THEMES.papiro.smallCaps).toBe(true);
    expect(PDF_THEMES.renacentista.smallCaps).toBe(true);
    expect(PDF_THEMES.grimorio.rubrication).toBe(true);
    expect(PDF_THEMES.pergamino.rubrication).toBe(true);
    expect(PDF_THEMES.cruzada.rubrication).toBe(true);
    expect(PDF_THEMES.cruzada.dropCapBoxed).toBe(true);
    expect(PDF_THEMES.papiro.rubrication).toBe(false);
    expect(PDF_THEMES.celta.rubrication).toBe(false);
    expect(PDF_THEMES.alquimia.rubrication).toBe(false);
  });

  it("los temas oscuros grimorio y alquimia marcan dark y los claros no", () => {
    expect(PDF_THEMES.grimorio.dark).toBe(true);
    expect(PDF_THEMES.alquimia.dark).toBe(true);
    for (const id of THEME_IDS.filter((t) => t !== "grimorio" && t !== "alquimia")) {
      expect(PDF_THEMES[id].dark, `${id} dark`).toBe(false);
    }
    expect(THEME_IDS).toHaveLength(8);
  });

  it("los watermarks de los temas nuevos tienen formas distintas", () => {
    const shapes = THEME_IDS.filter((t) => t !== "clasico").map((id) => PDF_THEMES[id].watermarkSvg);
    expect(new Set(shapes).size).toBe(shapes.length);
    expect(PDF_THEMES.celta.watermarkSvg).toContain("circle");
    expect(PDF_THEMES.cruzada.watermarkSvg).toContain("path");
    expect(PDF_THEMES.renacentista.watermarkSvg).toContain("circle");
    expect(PDF_THEMES.alquimia.watermarkSvg).toContain("path");
  });

  it("isThemeId valida identificadores", () => {
    expect(isThemeId("grimorio")).toBe(true);
    expect(isThemeId("clasico")).toBe(true);
    expect(isThemeId("celta")).toBe(true);
    expect(isThemeId("cruzada")).toBe(true);
    expect(isThemeId("renacentista")).toBe(true);
    expect(isThemeId("alquimia")).toBe(true);
    expect(isThemeId("otro")).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });

  it("el presupuesto de fuentes embebidas se mantiene bajo control", () => {
    const woff2Total = FONTS_DATA.reduce((n, f) => n + f.base64.length, 0);
    const ttfTotal = FONTS_TTF_DATA.reduce((n, f) => n + f.base64.length, 0);
    expect(woff2Total).toBeGreaterThan(0);
    expect(woff2Total).toBeLessThan(800 * 1024);
    expect(ttfTotal).toBeGreaterThan(0);
    expect(ttfTotal).toBeLessThan(1200 * 1024);
    expect(FONT_FILES.length).toBeGreaterThan(0);
    expect(FONTS_TTF_DATA.length).toBeGreaterThan(0);
    for (const f of FONTS_TTF_DATA) {
      expect(f.family.length).toBeGreaterThan(0);
      expect(f.base64.length).toBeGreaterThan(0);
    }
  });

  it("los temas usan solo familias disponibles en el pipeline de fuentes", () => {
    const available = new Set(FONT_FILES.map((f) => f.family));
    const ttfAvailable = new Set(FONTS_TTF_DATA.map((f) => f.family));
    for (const id of THEME_IDS) {
      for (const family of PDF_THEMES[id].fontFamilies) {
        expect(available.has(family), `${id} -> ${family} en FONT_FILES`).toBe(true);
        if (id !== "clasico") {
          expect(ttfAvailable.has(family), `${id} -> ${family} en FONTS_TTF_DATA`).toBe(true);
        }
      }
    }
  });

  it("officeTheme invierte la paleta de los temas oscuros a papel claro", () => {
    for (const id of THEME_IDS.filter((t) => PDF_THEMES[t].dark)) {
      const ot = officeTheme(PDF_THEMES[id]);
      expect(ot.paperBg, `${id} paperBg`).toBe("#f5f0e8");
      expect(ot.text).toBe("#2a1f14");
      expect(ot.accent).toBe("#8b6914");
      expect(ot.fontFamilies.length).toBeGreaterThan(0);
      expect(ot.fontFamilies).toEqual(PDF_THEMES[id].fontFamilies);
    }
    expect(officeTheme(PDF_THEMES.grimorio).paperBg).toBe("#f5f0e8");
    expect(officeTheme(PDF_THEMES.alquimia).paperBg).toBe("#f5f0e8");
  });

  it("officeTheme de los temas claros conserva sus colores (clasico blanco)", () => {
    expect(officeTheme(PDF_THEMES.clasico).paperBg).toBe("#ffffff");
    for (const id of THEME_IDS.filter((t) => t !== "clasico" && !PDF_THEMES[t].dark)) {
      const ot = officeTheme(PDF_THEMES[id]);
      expect(ot.paperBg, `${id} paperBg`).toBe(PDF_THEMES[id].bg);
      expect(ot.accent, `${id} accent`).toBe(PDF_THEMES[id].accent);
    }
  });
});
