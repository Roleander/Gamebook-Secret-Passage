import { FONT_FILES } from "./font-files";

export type ThemeId = "clasico" | "grimorio" | "papiro" | "pergamino" | "celta" | "cruzada" | "renacentista" | "alquimia";

export const THEME_IDS: ThemeId[] = ["clasico", "grimorio", "papiro", "pergamino", "celta", "cruzada", "renacentista", "alquimia"];
export const DEFAULT_THEME: ThemeId = "clasico";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as string[]).includes(value);
}

export const THEME_SWATCH: Record<ThemeId, string> = {
  clasico: "#f5f0e8",
  grimorio: "#1d1712",
  papiro: "#f1e6c4",
  pergamino: "#f6efdd",
  celta: "#e9e2cf",
  cruzada: "#efe6d2",
  renacentista: "#faf6ee",
  alquimia: "#161821",
};

export interface PdfTheme {
  id: ThemeId;
  bg: string;
  containerBg: string;
  containerShadow: string;
  printBg: string;
  text: string;
  subtitle: string;
  accent: string;
  linksBg: string;
  linksBorder: string;
  linkInline: string;
  linkDotted: string;
  fontBody: string;
  fontHeading: string;
  headingWeight: string;
  h1LetterSpacing: string;
  uppercaseHeadings: boolean;
  dropCap: boolean;
  ornament: boolean;
  bodyTexture: string;
  containerTexture: string;
  fontFamilies: string[];
  dark: boolean;
  watermarkSvg?: string;
  watermarkOpacity?: number;
  emblemSvg?: string;
  dividerSvg?: string;
  pageFrame?: boolean;
  dropCapBoxed?: boolean;
  rubrication?: boolean;
  smallCaps?: boolean;
}

export const SVG_WATERMARK_GRIMORIO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="50" cy="50" r="47"/><path d="M50 12 L83 68 H17 Z"/><path d="M50 88 L17 32 H83 Z"/></svg>';

export const SVG_WATERMARK_PAPIRO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><ellipse cx="32" cy="18" rx="14" ry="16"/><path d="M32 34 V88 M12 50 H52"/></svg>';

export const SVG_WATERMARK_PERGAMINO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80" fill="currentColor"><path d="M32 4c3 10 3 18 0 26-3-8-3-16 0-26zM32 32c8-10 18-12 26-10-4 12-14 18-26 18V32zm0 0c-8-10-18-12-26-10 4 12 14 18 26 18v-8zM29 50h6v20h-6zM22 74h20v4H22z"/></svg>';

export const SVG_WATERMARK_CELTA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="10"/><path d="M50 12V88M12 50H88"/><path d="M28 28c8 4 12 12 8 20M72 28c-8 4-12 12-8 20M28 72c8-4 12-12 8-20M72 72c-8-4-12-12-8-20"/></svg>';

export const SVG_WATERMARK_CRUZADA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80" fill="currentColor"><path d="M32 2c3 10 3 18 0 26-3-8-3-16 0-26zM32 30c8-10 18-12 26-10-4 12-14 18-26 18V30zm0 0c-8-10-18-12-26-10 4 12 14 18 26 18v-8zM29 48h6v18h-6zM20 68h24v4H20z"/></svg>';

export const SVG_WATERMARK_RENACENTISTA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="34"/><path d="M50 16v68M16 50h68"/><path d="M26 26l48 48M74 26L26 74"/></svg>';

export const SVG_WATERMARK_ALQUIMIA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="50" cy="50" r="46"/><path d="M50 20 L78 68 H22 Z"/><circle cx="50" cy="54" r="12"/><path d="M50 12v10M50 78v10M12 50h10M78 50h10"/></svg>';

export const SVG_DIVIDER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 12" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 6h44M72 6h44"/><path d="M60 2l4 4-4 4-4-4z" fill="currentColor" stroke="none"/></svg>';

export const PDF_THEMES: Record<ThemeId, PdfTheme> = {
  clasico: {
    id: "clasico",
    bg: "#f5f0e8",
    containerBg: "white",
    containerShadow: "0 0 20px rgba(0,0,0,0.1)",
    printBg: "white",
    text: "#1a1410",
    subtitle: "#666",
    accent: "#8b4513",
    linksBg: "#faf8f5",
    linksBorder: "#e0d5c5",
    linkInline: "#8b4513",
    linkDotted: "#c9a96e",
    fontBody: "Georgia, 'Times New Roman', serif",
    fontHeading: "Georgia, 'Times New Roman', serif",
    headingWeight: "bold",
    h1LetterSpacing: "2px",
    uppercaseHeadings: false,
    dropCap: false,
    ornament: false,
    bodyTexture: "",
    containerTexture: "",
    fontFamilies: [],
    dark: false,
  },
  grimorio: {
    id: "grimorio",
    bg: "#14100c",
    containerBg: "#1d1712",
    containerShadow: "0 0 24px rgba(0,0,0,0.5)",
    printBg: "#14100c",
    text: "#e8dcc0",
    subtitle: "#a89870",
    accent: "#c9a96e",
    linksBg: "#241d15",
    linksBorder: "#4a3a26",
    linkInline: "#c9a96e",
    linkDotted: "#c9a96e",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'UnifrakturMaguntia', Georgia, serif",
    headingWeight: "400",
    h1LetterSpacing: "2px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(ellipse at top, rgba(201,169,110,0.06), transparent 65%), repeating-linear-gradient(45deg, rgba(0,0,0,0.10) 0px, transparent 12px, transparent 28px)",
    containerTexture:
      "radial-gradient(ellipse at center, rgba(201,169,110,0.05) 0, transparent 70%), repeating-linear-gradient(45deg, rgba(0,0,0,0.07) 0px, transparent 14px, transparent 32px)",
    fontFamilies: ["EB Garamond", "UnifrakturMaguntia"],
    dark: true,
    watermarkSvg: SVG_WATERMARK_GRIMORIO,
    watermarkOpacity: 0.06,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: false,
    rubrication: true,
    smallCaps: false,
  },
  papiro: {
    id: "papiro",
    bg: "#e7d5a3",
    containerBg: "#f1e6c4",
    containerShadow: "0 0 20px rgba(90,70,30,0.25)",
    printBg: "#e7d5a3",
    text: "#3b2f1e",
    subtitle: "#6b5b3e",
    accent: "#6e5217",
    linksBg: "#ece0b9",
    linksBorder: "#cbbb8a",
    linkInline: "#6e5217",
    linkDotted: "#a08535",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'Cinzel', Georgia, serif",
    headingWeight: "700",
    h1LetterSpacing: "4px",
    uppercaseHeadings: true,
    dropCap: false,
    ornament: true,
    bodyTexture:
      "repeating-linear-gradient(90deg, rgba(120,90,40,0.05) 0px, rgba(120,90,40,0.05) 1px, transparent 1px, transparent 18px)",
    containerTexture:
      "repeating-linear-gradient(90deg, rgba(120,90,40,0.045) 0px, rgba(120,90,40,0.045) 1px, transparent 1px, transparent 16px)",
    fontFamilies: ["EB Garamond", "Cinzel"],
    dark: false,
    watermarkSvg: SVG_WATERMARK_PAPIRO,
    watermarkOpacity: 0.05,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: false,
    rubrication: false,
    smallCaps: true,
  },
  pergamino: {
    id: "pergamino",
    bg: "#eadfc4",
    containerBg: "#f6efdd",
    containerShadow: "0 0 20px rgba(110,85,45,0.3)",
    printBg: "#eadfc4",
    text: "#43331f",
    subtitle: "#7a6a4f",
    accent: "#7a4a21",
    linksBg: "#f0e7d2",
    linksBorder: "#d3c3a0",
    linkInline: "#7a4a21",
    linkDotted: "#b08d5a",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'IM Fell English', Georgia, serif",
    headingWeight: "400",
    h1LetterSpacing: "1px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(circle at 20% 30%, rgba(140,100,50,0.08) 0, transparent 28%), radial-gradient(circle at 80% 65%, rgba(140,100,50,0.07) 0, transparent 32%), radial-gradient(circle at 55% 95%, rgba(120,85,45,0.06) 0, transparent 26%)",
    containerTexture:
      "radial-gradient(circle at 15% 20%, rgba(140,100,50,0.07) 0, transparent 24%), radial-gradient(circle at 85% 55%, rgba(140,100,50,0.06) 0, transparent 28%), radial-gradient(circle at 45% 90%, rgba(120,85,45,0.05) 0, transparent 22%)",
    fontFamilies: ["EB Garamond", "IM Fell English"],
    dark: false,
    watermarkSvg: SVG_WATERMARK_PERGAMINO,
    watermarkOpacity: 0.05,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: false,
    rubrication: true,
    smallCaps: false,
  },
  celta: {
    id: "celta",
    bg: "#e9e2cf",
    containerBg: "#f4f0e2",
    containerShadow: "0 0 20px rgba(90,80,40,0.25)",
    printBg: "#e9e2cf",
    text: "#2a2a1e",
    subtitle: "#5e5a42",
    accent: "#4a6741",
    linksBg: "#eae4cf",
    linksBorder: "#c9c0a0",
    linkInline: "#3d5a36",
    linkDotted: "#8a9a6a",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'MedievalSharp', Georgia, serif",
    headingWeight: "400",
    h1LetterSpacing: "1px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(circle at 25% 25%, rgba(74,103,65,0.05) 0, transparent 30%), radial-gradient(circle at 75% 75%, rgba(120,100,50,0.05) 0, transparent 30%)",
    containerTexture:
      "radial-gradient(circle at 20% 30%, rgba(74,103,65,0.04) 0, transparent 26%), radial-gradient(circle at 80% 60%, rgba(120,100,50,0.04) 0, transparent 28%)",
    fontFamilies: ["EB Garamond", "MedievalSharp"],
    dark: false,
    watermarkSvg: SVG_WATERMARK_CELTA,
    watermarkOpacity: 0.05,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: false,
    rubrication: false,
    smallCaps: false,
  },
  cruzada: {
    id: "cruzada",
    bg: "#efe6d2",
    containerBg: "#fdfaf0",
    containerShadow: "0 0 20px rgba(100,60,30,0.25)",
    printBg: "#efe6d2",
    text: "#1f1a14",
    subtitle: "#6b5b3e",
    accent: "#a01c1c",
    linksBg: "#f5efe0",
    linksBorder: "#d9c9a3",
    linkInline: "#8b1c1c",
    linkDotted: "#b8964a",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'UnifrakturCook', Georgia, serif",
    headingWeight: "700",
    h1LetterSpacing: "1px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(ellipse at top, rgba(160,28,28,0.04), transparent 60%)",
    containerTexture:
      "radial-gradient(ellipse at center, rgba(160,28,28,0.03), transparent 70%)",
    fontFamilies: ["EB Garamond", "UnifrakturCook"],
    dark: false,
    watermarkSvg: SVG_WATERMARK_CRUZADA,
    watermarkOpacity: 0.06,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: true,
    rubrication: true,
    smallCaps: false,
  },
  renacentista: {
    id: "renacentista",
    bg: "#faf6ee",
    containerBg: "#ffffff",
    containerShadow: "0 0 20px rgba(120,80,40,0.15)",
    printBg: "#faf6ee",
    text: "#2b2620",
    subtitle: "#6b6459",
    accent: "#8c2f39",
    linksBg: "#f7f3eb",
    linksBorder: "#ddd4c4",
    linkInline: "#8c2f39",
    linkDotted: "#c4a090",
    fontBody: "'Goudy Bookletter 1911', Georgia, 'Times New Roman', serif",
    fontHeading: "'Cinzel Decorative', Georgia, serif",
    headingWeight: "700",
    h1LetterSpacing: "3px",
    uppercaseHeadings: false,
    dropCap: false,
    ornament: true,
    bodyTexture:
      "radial-gradient(ellipse at top, rgba(140,47,57,0.03), transparent 60%)",
    containerTexture:
      "radial-gradient(ellipse at center, rgba(140,47,57,0.02), transparent 70%)",
    fontFamilies: ["Goudy Bookletter 1911", "Cinzel Decorative"],
    dark: false,
    watermarkSvg: SVG_WATERMARK_RENACENTISTA,
    watermarkOpacity: 0.04,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: false,
    rubrication: false,
    smallCaps: true,
  },
  alquimia: {
    id: "alquimia",
    bg: "#12141a",
    containerBg: "#1a1d26",
    containerShadow: "0 0 24px rgba(0,0,0,0.55)",
    printBg: "#12141a",
    text: "#d9d4c5",
    subtitle: "#a39b85",
    accent: "#c9a227",
    linksBg: "#22262f",
    linksBorder: "#3d4452",
    linkInline: "#c9a227",
    linkDotted: "#8a7a4a",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'Pirata One', Georgia, serif",
    headingWeight: "400",
    h1LetterSpacing: "2px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(ellipse at top, rgba(201,162,39,0.05), transparent 65%)",
    containerTexture:
      "radial-gradient(ellipse at center, rgba(201,162,39,0.04), transparent 70%)",
    fontFamilies: ["EB Garamond", "Pirata One"],
    dark: true,
    watermarkSvg: SVG_WATERMARK_ALQUIMIA,
    watermarkOpacity: 0.06,
    dividerSvg: SVG_DIVIDER,
    pageFrame: true,
    dropCapBoxed: false,
    rubrication: false,
    smallCaps: false,
  },
};

export interface OfficeTheme {
  id: ThemeId;
  paperBg: string;
  text: string;
  subtitle: string;
  accent: string;
  linkInline: string;
  linkDotted: string;
  linksBg: string;
  linksBorder: string;
  fontBody: string;
  fontHeading: string;
  headingWeight: string;
  uppercaseHeadings: boolean;
  fontFamilies: string[];
}

export function officeTheme(th: PdfTheme): OfficeTheme {
  if (th.dark) {
    return {
      id: th.id,
      paperBg: "#f5f0e8",
      text: "#2a1f14",
      subtitle: "#6b5b3e",
      accent: "#8b6914",
      linkInline: "#8b6914",
      linkDotted: "#b08d5a",
      linksBg: "#f0e6d0",
      linksBorder: "#d4c49a",
      fontBody: th.fontBody,
      fontHeading: th.fontHeading,
      headingWeight: th.headingWeight,
      uppercaseHeadings: false,
      fontFamilies: th.fontFamilies,
    };
  }
  return {
    id: th.id,
    paperBg: th.id === "clasico" ? "#ffffff" : th.bg,
    text: th.text,
    subtitle: th.subtitle,
    accent: th.accent,
    linkInline: th.linkInline,
    linkDotted: th.linkDotted,
    linksBg: th.linksBg,
    linksBorder: th.linksBorder,
    fontBody: th.fontBody,
    fontHeading: th.fontHeading,
    headingWeight: th.headingWeight,
    uppercaseHeadings: th.uppercaseHeadings,
    fontFamilies: th.fontFamilies,
  };
}

export function pdfThemeRules(th: PdfTheme): string {
  if (th.id === "clasico") return "";
  const rules: string[] = [];
  rules.push(
    `.cover h1 { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; }`
  );
  rules.push(
    `.passage-number-center, .passage-number-left { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; }`
  );
  if (th.uppercaseHeadings) {
    rules.push(
      `.cover h1, .passage-number-center, .passage-number-left { text-transform: uppercase; }`
    );
  }
  if (th.smallCaps) {
    rules.push(
      `.cover .subtitle, .passage-number-center, .passage-number-left { font-variant: small-caps; letter-spacing: 1px; }`
    );
  }
  if (th.ornament) {
    rules.push(
      `.cover-ornament { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }`,
      `.cover-ornament::before, .cover-ornament::after { content: ""; height: 1px; width: 80px; background: ${th.accent}; opacity: 0.55; }`,
      `.cover-ornament span { width: 8px; height: 8px; background: ${th.accent}; transform: rotate(45deg); }`
    );
  }
  if (th.emblemSvg) {
    rules.push(
      `.cover-emblem { display: flex; justify-content: center; margin-bottom: 12px; color: ${th.accent}; }`,
      `.cover-emblem svg { width: 56px; height: 56px; opacity: 0.85; }`
    );
  }
  if (th.watermarkSvg) {
    rules.push(
      `.page-watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0; color: ${th.accent}; opacity: ${th.watermarkOpacity ?? 0.06}; }`,
      `.page-watermark svg { width: 340px; height: 340px; }`,
      `.container { position: relative; }`,
      `.container > *:not(.page-watermark) { position: relative; z-index: 1; }`
    );
  }
  if (th.pageFrame) {
    rules.push(
      `.container { border: 1px solid ${th.linksBorder}; outline: 1px solid ${th.linksBorder}; outline-offset: 3px; }`
    );
  }
  if (th.dividerSvg) {
    rules.push(
      `.passage-divider { display: flex; align-items: center; justify-content: center; margin: 10px auto; color: ${th.accent}; opacity: 0.45; }`,
      `.passage-divider svg { width: 90px; height: 10px; }`
    );
  }
  if (th.dropCap) {
    const boxed = th.dropCapBoxed
      ? ` background: ${th.accent}; color: ${th.containerBg}; padding: 2px 8px; border-radius: 3px; margin-right: 6px;`
      : "";
    rules.push(
      `.passage-content::first-letter { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; font-size: 2.6em; line-height: 0.85; float: left; padding: 3px 6px 0 0; color: ${th.accent};${boxed} }`
    );
  }
  if (th.rubrication) {
    rules.push(
      `.start-marker { color: ${th.accent}; }`,
      `.passage-number-center .start-marker, .passage-number-left .start-marker { color: ${th.accent}; }`
    );
  }
  return rules.join("\n    ");
}

interface PvPalette {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  card: string;
  cardForeground: string;
}

const PV_PALETTES: Record<Exclude<ThemeId, "clasico">, PvPalette> = {
  grimorio: {
    background: "#14100c",
    foreground: "#e8dcc0",
    primary: "#c9a96e",
    primaryForeground: "#14100c",
    secondary: "#241d15",
    secondaryForeground: "#e8dcc0",
    muted: "#241d15",
    mutedForeground: "#a89870",
    accent: "#2a2015",
    accentForeground: "#e8dcc0",
    border: "#4a3a26",
    input: "#241d15",
    ring: "#c9a96e",
    card: "#1d1712",
    cardForeground: "#e8dcc0",
  },
  papiro: {
    background: "#e7d5a3",
    foreground: "#3b2f1e",
    primary: "#6e5217",
    primaryForeground: "#f1e6c4",
    secondary: "#ece0b9",
    secondaryForeground: "#3b2f1e",
    muted: "#ece0b9",
    mutedForeground: "#6b5b3e",
    accent: "#e2d3a0",
    accentForeground: "#3b2f1e",
    border: "#cbbb8a",
    input: "#ece0b9",
    ring: "#6e5217",
    card: "#f1e6c4",
    cardForeground: "#3b2f1e",
  },
  pergamino: {
    background: "#eadfc4",
    foreground: "#43331f",
    primary: "#7a4a21",
    primaryForeground: "#f6efdd",
    secondary: "#f0e7d2",
    secondaryForeground: "#43331f",
    muted: "#f0e7d2",
    mutedForeground: "#7a6a4f",
    accent: "#e5d8b8",
    accentForeground: "#43331f",
    border: "#d3c3a0",
    input: "#f0e7d2",
    ring: "#7a4a21",
    card: "#f6efdd",
    cardForeground: "#43331f",
  },
  celta: {
    background: "#e9e2cf",
    foreground: "#2a2a1e",
    primary: "#4a6741",
    primaryForeground: "#f4f0e2",
    secondary: "#eae4cf",
    secondaryForeground: "#2a2a1e",
    muted: "#eae4cf",
    mutedForeground: "#5e5a42",
    accent: "#d9d2b5",
    accentForeground: "#2a2a1e",
    border: "#c9c0a0",
    input: "#eae4cf",
    ring: "#4a6741",
    card: "#f4f0e2",
    cardForeground: "#2a2a1e",
  },
  cruzada: {
    background: "#efe6d2",
    foreground: "#1f1a14",
    primary: "#a01c1c",
    primaryForeground: "#fdfaf0",
    secondary: "#f5efe0",
    secondaryForeground: "#1f1a14",
    muted: "#f5efe0",
    mutedForeground: "#6b5b3e",
    accent: "#e8dcc0",
    accentForeground: "#1f1a14",
    border: "#d9c9a3",
    input: "#f5efe0",
    ring: "#a01c1c",
    card: "#fdfaf0",
    cardForeground: "#1f1a14",
  },
  renacentista: {
    background: "#faf6ee",
    foreground: "#2b2620",
    primary: "#8c2f39",
    primaryForeground: "#ffffff",
    secondary: "#f7f3eb",
    secondaryForeground: "#2b2620",
    muted: "#f7f3eb",
    mutedForeground: "#6b6459",
    accent: "#ebe3d2",
    accentForeground: "#2b2620",
    border: "#ddd4c4",
    input: "#f7f3eb",
    ring: "#8c2f39",
    card: "#ffffff",
    cardForeground: "#2b2620",
  },
  alquimia: {
    background: "#12141a",
    foreground: "#d9d4c5",
    primary: "#c9a227",
    primaryForeground: "#12141a",
    secondary: "#22262f",
    secondaryForeground: "#d9d4c5",
    muted: "#22262f",
    mutedForeground: "#a39b85",
    accent: "#2a2e38",
    accentForeground: "#d9d4c5",
    border: "#3d4452",
    input: "#22262f",
    ring: "#c9a227",
    card: "#1a1d26",
    cardForeground: "#d9d4c5",
  },
};

export function pvThemeCss(theme: ThemeId): string {
  if (theme === "clasico") return "";
  const th = PDF_THEMES[theme];
  const p = PV_PALETTES[theme];
  const faces = FONT_FILES.filter((f) => th.fontFamilies.includes(f.family))
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-style: ${f.style}; font-weight: ${f.weight}; font-display: swap; src: url('${f.url}') format('woff2'); unicode-range: ${f.unicodeRange}; }`
    )
    .join("\n");
  const headRule = `[data-pv-theme="${theme}"] h1, [data-pv-theme="${theme}"] h2 { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; }`;
  const upperRule = th.uppercaseHeadings
    ? `\n[data-pv-theme="${theme}"] h1, [data-pv-theme="${theme}"] h2 { text-transform: uppercase; letter-spacing: 2px; }`
    : "";
  const smallCapsRule = th.smallCaps
    ? `\n[data-pv-theme="${theme}"] .text-muted-foreground { font-variant: small-caps; }`
    : "";
  const texture = th.containerTexture || th.bodyTexture;
  let watermarkRule = "";
  if (th.watermarkSvg) {
    const svgUri = `url("data:image/svg+xml,${encodeURIComponent(th.watermarkSvg).replace(/'/g, "%27")}")`;
    watermarkRule = `
[data-pv-theme="${theme}"]::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: ${svgUri};
  background-repeat: no-repeat;
  background-position: center;
  background-size: 320px 320px;
  opacity: ${(th.watermarkOpacity ?? 0.06) + 0.02};
}
[data-pv-theme="${theme}"] > * { position: relative; z-index: 1; }`;
  }
  const frameRule = th.pageFrame
    ? `\n[data-pv-theme="${theme}"] .container { border: 1px solid ${th.linksBorder}; outline: 1px solid ${th.linksBorder}; outline-offset: 3px; }`
    : "";
  return `${faces}
[data-pv-theme="${theme}"] {
  --background: ${p.background};
  --foreground: ${p.foreground};
  --primary: ${p.primary};
  --primary-foreground: ${p.primaryForeground};
  --secondary: ${p.secondary};
  --secondary-foreground: ${p.secondaryForeground};
  --muted: ${p.muted};
  --muted-foreground: ${p.mutedForeground};
  --accent: ${p.accent};
  --accent-foreground: ${p.accentForeground};
  --border: ${p.border};
  --input: ${p.input};
  --ring: ${p.ring};
  --card: ${p.card};
  --card-foreground: ${p.cardForeground};
  background-color: ${p.background};
  background-image: ${texture};
  font-family: ${th.fontBody};
  color: ${p.foreground};
}
${headRule}${upperRule}${smallCapsRule}${watermarkRule}${frameRule}`;
}
