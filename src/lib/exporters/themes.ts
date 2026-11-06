import { FONT_FILES } from "./font-files";

export type ThemeId = "clasico" | "grimorio" | "papiro" | "pergamino" | "celta" | "cruzada" | "renacentista" | "alquimia" | "iluminado";

export const THEME_IDS: ThemeId[] = ["clasico", "grimorio", "papiro", "pergamino", "celta", "cruzada", "renacentista", "alquimia", "iluminado"];
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
  iluminado: "#efe3c4",
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
  cornerSvg?: string;
  cornerTopSvg?: string;
  bandSvg?: string;
  sideBandSvg?: string;
  medallionSvg?: string;
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

export const SVG_WATERMARK_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="38"/><path d="M50 18c6 12 6 24 0 36-6-12-6-24 0-36z"/><path d="M50 54c-12-10-24-10-34-4 8 12 20 16 34 12"/><path d="M50 54c12-10 24-10 34-4-8 12-20 16-34 12"/><path d="M50 62v18M42 74h16"/><circle cx="50" cy="50" r="6"/></svg>';

export const SVG_DIVIDER_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M6 8h52M102 8h52"/><path d="M80 2l6 6-6 6-6-6z" fill="currentColor" stroke="none"/><path d="M64 8c4-6 10-6 12 0-2 6-8 6-12 0zM96 8c-4-6-10-6-12 0 2 6 8 6 12 0z"/></svg>';

export const SVG_CORNER_TOP_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g fill="none" stroke="#b08d2a" stroke-width="2" stroke-linecap="round"><path d="M2 58V14A12 12 0 0 1 14 2h44"/><path d="M10 66V22A12 12 0 0 1 22 10h46"/><path d="M14 98C18 72 34 54 58 46c18-6 30-18 34-36"/><path d="M22 104C26 82 40 66 62 60"/><path d="M78 6c10 2 18 10 20 20"/></g><g fill="none" stroke="#b08d2a" stroke-width="1.6" stroke-linecap="round"><path d="M24 96c-10-12-6-26 6-30 10-3 18 5 16 14-2 8-12 11-17 5"/><path d="M96 30c10 0 18 8 20 18"/></g><g fill="#1f3f7a" stroke="#b08d2a" stroke-width="1.4"><path d="M52 40c-2-12 10-18 18-12-1 10-8 16-18 12z"/></g><g fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.4"><path d="M40 64c-12 2-18-8-12-16 9 0 15 6 12 16z"/></g><g><circle cx="62" cy="54" r="7" fill="#8c1c1c" stroke="#b08d2a" stroke-width="2"/><circle cx="62" cy="54" r="3" fill="#c9a227"/><path d="M62 40v-8M62 76v-8M46 54h-8M86 54h-8M51 43l-5-5M78 70l-5-5M73 43l5-5M46 70l5-5" stroke="#b08d2a" stroke-width="2"/></g></svg>';

export const SVG_CORNER_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 150"><path d="M98 78 C88 58 76 34 62 12 C72 16 82 22 88 30 C84 31 81 32 79 34 C88 37 96 42 102 48 C96 49 92 51 90 53 C95 59 97 68 98 78 Z" fill="#1f3f7a" stroke="#b08d2a" stroke-width="2" stroke-linejoin="round"/><g stroke="#b08d2a" stroke-width="1.3" fill="none"><path d="M98 78 L64 14"/><path d="M98 78 L88 30"/><path d="M98 78 L102 48"/><path d="M98 78 L90 53"/></g><path d="M106 82 C98 62 90 34 84 10 C90 12 94 14 96 16 C96 20 97 24 98 28 C102 26 106 26 110 26 C110 30 109 34 108 38 C112 39 117 40 122 42 C120 45 118 48 116 52 C118 55 119 58 120 62 C114 66 109 74 106 82 Z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="2.4" stroke-linejoin="round"/><g stroke="#b08d2a" stroke-width="1.4" fill="none"><path d="M106 82 L86 12"/><path d="M106 82 L96 16"/><path d="M106 82 L110 26"/><path d="M106 82 L122 42"/><path d="M106 82 L120 62"/></g><path d="M90 18 C95 21 98 24 100 28" stroke="#c9a227" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M74 118 C56 132 34 138 24 126 C14 114 22 100 34 100 C42 100 46 107 42 113" fill="none" stroke="#b08d2a" stroke-width="8" stroke-linecap="round"/><path d="M74 118 C56 132 34 138 24 126 C14 114 22 100 34 100 C42 100 46 107 42 113" fill="none" stroke="#8c1c1c" stroke-width="4.5" stroke-linecap="round"/><path d="M74 118 C82 110 90 102 96 94 C101 87 104 82 107 76" fill="none" stroke="#b08d2a" stroke-width="19" stroke-linecap="round"/><path d="M74 118 C82 110 90 102 96 94 C101 87 104 82 107 76" fill="none" stroke="#1f3f7a" stroke-width="14" stroke-linecap="round"/><g stroke="#b08d2a" stroke-width="1.5" fill="none"><path d="M79 119 C83 113 87 107 92 103"/><path d="M85 121 C89 115 94 109 98 105"/><path d="M91 123 C95 117 99 112 103 108"/></g><path d="M107 78 C112 70 118 62 124 56" fill="none" stroke="#b08d2a" stroke-width="15" stroke-linecap="round"/><path d="M107 78 C112 70 118 62 124 56" fill="none" stroke="#1f3f7a" stroke-width="10" stroke-linecap="round"/><path d="M122 56 C121 46 127 39 137 37 L157 40 C162 41 162 46 157 48 C151 50 145 52 141 54 L142 59 C136 64 124 64 122 56 Z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="2.4"/><path d="M130 60 C138 64 150 60 158 53 L160 57 C153 63 141 68 131 65 Z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="2"/><path d="M132 59 C140 60 150 56 157 52 C150 58 140 62 133 61 Z" fill="#6d1010" stroke="none"/><path d="M135 58 C141 56 147 54 153 51" fill="none" stroke="#c9a227" stroke-width="1.8" stroke-linecap="round"/><circle cx="144" cy="46" r="2.6" fill="#c9a227" stroke="#b08d2a" stroke-width="1"/><circle cx="144" cy="46" r="1" fill="#3b2a1a"/><path d="M126 45 C118 35 108 28 100 31 C108 35 114 42 118 52" fill="#1f3f7a" stroke="#b08d2a" stroke-width="1.8"/><path d="M131 40 C125 31 115 23 106 27 C116 31 122 38 125 47" fill="#1f3f7a" stroke="#b08d2a" stroke-width="1.8"/><path d="M128 44 l-4 -9 8 3 2 -8 4 10" fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.4"/><path d="M148 51 l1 3 2 -3 M154 47 l1 3 2 -3" fill="#f7edd2" stroke="#b08d2a" stroke-width=".8"/><path d="M124 56 l-5 5 6 0 -2 6 6 -2 0 6 5 -6" fill="#b08d2a" stroke="#b08d2a" stroke-width="1.4" stroke-linejoin="round"/><path d="M76 116 C78 125 80 131 78 137" stroke="#b08d2a" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M76 116 C78 125 80 131 78 137" stroke="#1f3f7a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M78 137 l-8 5 M78 137 l0 8 M78 137 l8 5" stroke="#b08d2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M106 98 C110 106 111 113 110 120" stroke="#b08d2a" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M106 98 C110 106 111 113 110 120" stroke="#1f3f7a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M110 120 l-7 6 M110 120 l1 8 M110 120 l8 5" stroke="#b08d2a" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M42 113 l-2 -11 10 6 5 -9 3 12 z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.6"/><path d="M2 144 C20 136 38 144 56 142 C74 140 88 146 104 144 C124 141 150 146 178 142" fill="none" stroke="#b08d2a" stroke-width="2.4"/><path d="M16 148 C30 140 44 148 58 142" fill="none" stroke="#1f3f7a" stroke-width="3"/><path d="M112 148 C128 142 144 148 160 143" fill="none" stroke="#8c1c1c" stroke-width="3"/><circle cx="66" cy="146" r="2" fill="#c9a227"/><circle cx="104" cy="144" r="2" fill="#c9a227"/></svg>';

export const SVG_BAND_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="64"><defs><pattern id="__ID__" width="150" height="64" patternUnits="userSpaceOnUse"><g fill="none" stroke="#b08d2a" stroke-width="1.5" stroke-linecap="round"><path d="M0 8h150M0 56h150"/><path d="M0 12h150M0 52h150" opacity=".55"/><path d="M0 32C25 10 50 10 75 32S125 54 150 32"/><path d="M0 40C25 18 50 18 75 40S125 62 150 40" opacity=".5"/><path d="M30 22c-6-8 2-16 10-12M120 42c6 8-2 16-10 12"/></g><g fill="#1f3f7a" stroke="#b08d2a" stroke-width="1.2"><path d="M33 22c-4-7 3-13 10-9-1 7-5 11-10 9z"/></g><g fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.2"><path d="M92 38c4-7 12-5 12 3-5 3-10 2-12-3z"/></g><g fill="#c9a227"><circle cx="20" cy="34" r="2.2"/><circle cx="130" cy="30" r="2.2"/><path d="M75 27l5 5-5 5-5-5z"/></g></pattern></defs><rect width="100%" height="64" fill="url(#__ID__)"/></svg>';

export const SVG_SIDE_BAND_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="150"><defs><pattern id="__ID__" width="64" height="150" patternUnits="userSpaceOnUse"><g fill="none" stroke="#b08d2a" stroke-width="1.5" stroke-linecap="round"><path d="M8 0v150M56 0v150"/><path d="M12 0v150M52 0v150" opacity=".55"/><path d="M32 0C10 25 10 50 32 75S54 125 32 150"/><path d="M40 0C18 25 18 50 40 75S62 125 40 150" opacity=".5"/><path d="M22 30c-8-6-16 2-12 10M42 120c8 6 16-2 12-10"/></g><g fill="#1f3f7a" stroke="#b08d2a" stroke-width="1.2"><path d="M22 30c-7-4-13 3-9 10 7-1 11-5 9-10z"/></g><g fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.2"><path d="M38 118c7-4 13 3 9 10-7-1-11-5-9-10z"/></g><g fill="#c9a227"><circle cx="30" cy="20" r="2.2"/><circle cx="34" cy="130" r="2.2"/><path d="M29 71l5 5-5 5-5-5z"/></g></pattern></defs><rect width="64" height="100%" fill="url(#__ID__)"/></svg>';

export const SVG_MEDALLION_ILUMINADO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 100"><g fill="none" stroke="#b08d2a" stroke-width="2"><circle cx="90" cy="50" r="34"/><circle cx="90" cy="50" r="29" opacity=".65"/><path d="M56 42C36 26 20 24 8 32c14 4 22 12 26 24M124 42c20-16 36-18 48-10-14 4-22 12-26 24"/><path d="M56 60C36 76 20 78 8 70c14-4 22-12 26-24M124 60c20 16 36 18 48 10-14-4-22-12-26-24"/></g><path d="M82 50C84 34 94 24 108 22c-4 12-10 20-20 26z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.4"/><path d="M88 48c4-8 10-14 16-18M84 50c5-5 10-9 16-12" fill="none" stroke="#b08d2a" stroke-width="1"/><path d="M68 50c8-6 18-6 26 0 6 4 10 5 16 3" fill="none" stroke="#b08d2a" stroke-width="10" stroke-linecap="round"/><path d="M68 50c8-6 18-6 26 0 6 4 10 5 16 3" fill="none" stroke="#1f3f7a" stroke-width="6" stroke-linecap="round"/><path d="M110 53c12 2 18-6 14-14" fill="none" stroke="#b08d2a" stroke-width="6" stroke-linecap="round"/><path d="M110 53c12 2 18-6 14-14" fill="none" stroke="#1f3f7a" stroke-width="3" stroke-linecap="round"/><path d="M72 55l-4 10 4 1 4-8M100 57l-2 10 4 0 2-8" fill="none" stroke="#b08d2a" stroke-width="2.2" stroke-linecap="round"/><path d="M84 34c7 0 12 5 12 11 0 5-3 9-8 10l-14 2 6-6-10-3 8-4-4-6 10-4z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.6"/><path d="M68 48l-12 2 5 4-6 2 11 2" fill="none" stroke="#b08d2a" stroke-width="1.4"/><circle cx="79" cy="42" r="1.8" fill="#c9a227"/><path d="M86 32c0-6 4-10 10-11-2 4-2 8 0 10" fill="none" stroke="#b08d2a" stroke-width="1.6"/><path d="M56 46c-5-3-9-1-10 3 4 0 6 3 5 6 3-4 5-6 8-6z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.2"/><path d="M90 84l5 5-5 5-5-5z" fill="#8c1c1c" stroke="#b08d2a" stroke-width="1.2"/></svg>';

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
  iluminado: {
    id: "iluminado",
    bg: "#efe3c4",
    containerBg: "#f7edd2",
    containerShadow: "0 0 24px rgba(110,78,35,0.28)",
    printBg: "#efe3c4",
    text: "#2b2118",
    subtitle: "#6b5a3e",
    accent: "#8c1c1c",
    linksBg: "#f3e8cd",
    linksBorder: "#c9b17a",
    linkInline: "#1f3f7a",
    linkDotted: "#b08d2a",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'Cinzel Decorative', Georgia, serif",
    headingWeight: "700",
    h1LetterSpacing: "3px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(ellipse at 18% 22%, rgba(140,100,50,0.10) 0, transparent 32%), radial-gradient(ellipse at 82% 68%, rgba(120,85,45,0.09) 0, transparent 30%), radial-gradient(circle at 52% 92%, rgba(110,75,35,0.07) 0, transparent 24%), repeating-linear-gradient(0deg, rgba(120,90,45,0.025) 0px, rgba(120,90,45,0.025) 1px, transparent 1px, transparent 5px)",
    containerTexture:
      "radial-gradient(ellipse at 15% 18%, rgba(140,100,50,0.08) 0, transparent 26%), radial-gradient(ellipse at 85% 60%, rgba(120,85,45,0.07) 0, transparent 28%), radial-gradient(circle at 45% 88%, rgba(110,75,35,0.06) 0, transparent 22%), repeating-linear-gradient(0deg, rgba(120,90,45,0.02) 0px, rgba(120,90,45,0.02) 1px, transparent 1px, transparent 6px)",
    fontFamilies: ["EB Garamond", "Cinzel Decorative"],
    dark: false,
    watermarkSvg: SVG_WATERMARK_ILUMINADO,
    watermarkOpacity: 0.045,
    dividerSvg: SVG_DIVIDER_ILUMINADO,
    pageFrame: true,
    dropCapBoxed: true,
    rubrication: true,
    smallCaps: true,
    cornerSvg: SVG_CORNER_ILUMINADO,
    cornerTopSvg: SVG_CORNER_TOP_ILUMINADO,
    bandSvg: SVG_BAND_ILUMINADO,
    sideBandSvg: SVG_SIDE_BAND_ILUMINADO,
    medallionSvg: SVG_MEDALLION_ILUMINADO,
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
  if (th.cornerSvg) {
    rules.push(
      `.page-wrap { position: relative; max-width: 800px; margin: 0 auto; }`,
      `.page-decor { position: absolute; inset: 0; z-index: 20; pointer-events: none; color: ${th.linkDotted}; }`,
      `.page-decor::before { content: ""; position: absolute; inset: 64px; border: 1px solid ${th.linkDotted}; pointer-events: none; }`,
      `body { position: relative; }`,
      `.container { padding: 136px 118px 124px; }`,
      `.container.mobile { padding: 24px 18px; }`,
      `.decor-band { position: absolute; color: ${th.linkDotted}; }`,
      `.decor-band svg { display: block; width: 100%; height: 100%; }`,
      `.decor-top { top: 0; left: 0; right: 0; height: 64px; }`,
      `.decor-bottom { bottom: 0; left: 0; right: 0; height: 64px; transform: scaleY(-1); }`,
      `.decor-left { top: 0; bottom: 0; left: 0; width: 64px; }`,
      `.decor-right { top: 0; bottom: 0; right: 0; width: 64px; transform: scaleX(-1); }`,
      `.decor-corner { position: absolute; width: 128px; height: 128px; }`,
      `.decor-corner svg { width: 100%; height: 100%; }`,
      `.decor-bl, .decor-br { width: 150px; height: 125px; }`,
      `.decor-tl { top: 0; left: 0; }`,
      `.decor-tr { top: 0; right: 0; transform: scaleX(-1); }`,
      `.decor-bl { bottom: 0; left: 0; }`,
      `.decor-br { bottom: 0; right: 0; transform: scaleX(-1); }`,
      `.decor-medallion { position: absolute; left: 50%; width: 180px; height: 100px; transform: translateX(-50%); }`,
      `.decor-top-medallion { top: 0; }`,
      `.decor-bottom-medallion { bottom: 0; transform: translateX(-50%) scaleY(-1); }`,
      `.container { border: none; outline: none; box-shadow: ${th.containerShadow}; }`,
      `.cover { border-bottom: 3px double ${th.linkDotted}; padding-top: 120px; }`,
      `@media screen { .cover { padding-top: 0; } }`,
      `.passage-number-center::after, .passage-number-left::after { content: ""; display: block; width: 64px; height: 1px; margin: 6px auto 0; background: ${th.linkDotted}; opacity: 0.75; }`,
      `.passage-number-left::after { margin-left: 0; }`,
      `.page-flow { width: 100%; border-collapse: collapse; }`,
      `.page-flow thead, .page-flow tfoot { display: none; }`,
      `.page-flow .flow-left, .page-flow .flow-right { width: 0; padding: 0; }`,
      `.page-flow .flow-main { padding: 0; vertical-align: top; }`,
      `@media print { .page-decor { position: fixed; } .page-wrap { max-width: none; margin: 0; } html, body { background: ${th.printBg}; } .container { background: transparent; box-shadow: none; padding: 0; max-width: none; } .container.mobile { padding: 24px 18px; } .page-flow thead { display: table-header-group; } .page-flow tfoot { display: table-footer-group; } .page-flow thead td { height: 136px; padding: 0; font-size: 0; line-height: 0; } .page-flow tfoot td { height: 124px; padding: 0; font-size: 0; line-height: 0; } .page-flow .flow-left, .page-flow .flow-right { width: 118px; } }`
    );
    if (th.dropCap) {
      rules.push(
        `.container .passage-content::first-letter { background: ${th.linkInline}; color: ${th.containerBg}; border: 2px solid ${th.linkDotted}; box-shadow: 2px 2px 0 ${th.accent}; padding: 3px 8px; margin-right: 6px; }`
      );
    }
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
  iluminado: {
    background: "#efe3c4",
    foreground: "#2b2118",
    primary: "#8c1c1c",
    primaryForeground: "#f7edd2",
    secondary: "#f3e8cd",
    secondaryForeground: "#2b2118",
    muted: "#f3e8cd",
    mutedForeground: "#6b5a3e",
    accent: "#e6d6ae",
    accentForeground: "#2b2118",
    border: "#c9b17a",
    input: "#f3e8cd",
    ring: "#8c1c1c",
    card: "#f7edd2",
    cardForeground: "#2b2118",
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
  let cornerRule = "";
  if (th.cornerSvg && th.bandSvg) {
    const svg = (source: string) =>
      `url("data:image/svg+xml,${encodeURIComponent(source).replace(/'/g, "%27")}")`;
    const images: string[] = [];
    const positions: string[] = [];
    const repeats: string[] = [];
    const sizes: string[] = [];
    const layer = (source: string, position: string, repeat: string, size: string) => {
      images.push(svg(source));
      positions.push(position);
      repeats.push(repeat);
      sizes.push(size);
    };
    layer(th.bandSvg, "top left", "repeat-x", "150px 64px");
    layer(th.bandSvg, "bottom left", "repeat-x", "150px 64px");
    if (th.sideBandSvg) {
      layer(th.sideBandSvg, "top left", "repeat-y", "64px 150px");
      layer(th.sideBandSvg, "top right", "repeat-y", "64px 150px");
    }
    if (th.cornerTopSvg) {
      layer(th.cornerTopSvg, "top left", "no-repeat", "128px 128px");
      layer(th.cornerTopSvg, "top right", "no-repeat", "128px 128px");
    }
    layer(th.cornerSvg, "bottom left", "no-repeat", "150px 125px");
    layer(th.cornerSvg, "bottom right", "no-repeat", "150px 125px");
    if (th.medallionSvg) {
      layer(th.medallionSvg, "top center", "no-repeat", "180px 100px");
      layer(th.medallionSvg, "bottom center", "no-repeat", "180px 100px");
    }
    cornerRule = `
[data-pv-theme="${theme}"] .pv-page {
  background-image: ${images.join(", ")};
  background-position: ${positions.join(", ")};
  background-repeat: ${repeats.join(", ")};
  background-size: ${sizes.join(", ")};
  padding: 136px 118px 124px;
}`;
  }
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
${headRule}${upperRule}${smallCapsRule}${watermarkRule}${frameRule}${cornerRule}`;
}
