import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  PDF_THEMES,
  THEME_IDS,
  THEME_SWATCH,
  isThemeId,
  pdfThemeRules,
  pvThemeCss,
} from "@/lib/exporters/themes";

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

    for (const id of ["grimorio", "papiro", "pergamino"] as const) {
      const th = PDF_THEMES[id];
      expect(th.bodyTexture.length).toBeGreaterThan(0);
      expect(th.containerTexture.length).toBeGreaterThan(0);
      expect(th.printBg).toBe(th.bg);
      expect(pdfThemeRules(th)).not.toContain("feTurbulence");
      expect(pdfThemeRules(th)).not.toContain("data:image");
    }
  });

  it("isThemeId valida identificadores", () => {
    expect(isThemeId("grimorio")).toBe(true);
    expect(isThemeId("clasico")).toBe(true);
    expect(isThemeId("otro")).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(42)).toBe(false);
  });
});
