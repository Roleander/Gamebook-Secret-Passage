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
  iluminado: "#102443",
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
  friezeSvg?: string;
  emblemSize?: number;
  decor?: {
    band?: number;
    cornerTop?: number;
    cornerBottom?: { w: number; h: number };
    medallion?: { w: number; h: number };
    frieze?: number;
    frame?: { top: number; side: number; bottom: number };
  };
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

/* ── Tema iluminado: arte premium ──────────────────────────────────────────
   Azul lapislázuli, oro viejo, rojo minio y marfil. Todo el adorno es SVG
   inline: medallón de dragón, cenefa inferior con dos dragones, esquinas de
   acanto, roleos y filetes. */

export const SVG_WATERMARK_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="50" cy="50" r="46"/>
  <circle cx="50" cy="50" r="40" opacity=".6"/>
  <path d="M38 44c10-12 26-10 30 2 4 11-4 21-15 22-9 1-15-5-15-12 0-6 5-10 11-9"/>
  <path d="M38 44c-4-6-11-7-16-3 4 2 5 6 4 10 5 2 10-1 12-7z"/>
  <path d="M66 38c2-10 10-16 20-15-5 6-7 11-6 17"/>
  <path d="M52 66l-3 10M64 67l4 10"/>
  <path d="M40 40l-6-6M45 39l-3-8"/>
  <circle cx="44" cy="43" r="1.6" fill="currentColor" stroke="none"/>
</svg>`;

export const SVG_DIVIDER_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 16" fill="none">
  <path d="M4 8h50M106 8h50" stroke="#c9a227" stroke-width="1.1"/>
  <path d="M54 8c6-5 12-5 18 0-6 5-12 5-18 0zM106 8c-6-5-12-5-18 0 6 5 12 5 18 0z" stroke="#c9a227" stroke-width="1" opacity=".8"/>
  <path d="M80 1l7 7-7 7-7-7z" fill="#8c1c1c" stroke="#e8c96a" stroke-width="1.4"/>
  <path d="M80 4l4 4-4 4-4-4z" fill="#e8c96a"/>
  <circle cx="62" cy="8" r="1.6" fill="#c9a227"/>
  <circle cx="98" cy="8" r="1.6" fill="#c9a227"/>
</svg>`;

/** Hoja de acanto reutilizable: nace en (0,0) y apunta hacia +Y. */
function acantoIluminado(
  x: number,
  y: number,
  rotation: number,
  scale: number,
  fill: string
): string {
  return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">
    <path d="M0 0C7 8 11 17 12 26C8 23 4 23 1 25C6 32 9 40 8 48C3 44-1 43-5 45C-4 52-7 60-13 66C-14 57-18 52-23 50C-23 40-19 29-13 19C-8 11-3 5 0 0Z" fill="${fill}" stroke="#8a6a18" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M0 3C2 16 2 32-2 46M-4 24C-9 30-12 38-13 46M-2 40C-6 46-9 52-10 58" fill="none" stroke="#f3dd9a" stroke-width="1" opacity=".75"/>
  </g>`;
}

const ACANTO_ESQUINA_ILUMINADO = `
  <g fill="none" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round">
    <path d="M6 6C30 16 50 38 62 68c4 10 2 16-4 17-5 1-8-3-6-7"/>
    <path d="M10 10c34 6 64 30 84 68"/>
  </g>
  <path d="M14 14c26 6 46 24 60 48" fill="none" stroke="#8a6a18" stroke-width="1.2" opacity=".85"/>
  ${acantoIluminado(16, 16, -45, 1.22, "#c9a227")}
  ${acantoIluminado(14, 48, -18, 0.8, "#c9a227")}
  ${acantoIluminado(48, 14, -72, 0.8, "#c9a227")}
  ${acantoIluminado(54, 54, -40, 0.92, "#8c1c1c")}
  ${acantoIluminado(84, 84, -45, 0.66, "#21457c")}
  ${acantoIluminado(96, 38, -64, 0.55, "#c9a227")}
  ${acantoIluminado(38, 96, -24, 0.55, "#8c1c1c")}
  <g fill="#e8c96a" stroke="#8a6a18" stroke-width="1">
    <circle cx="40" cy="62" r="2.4"/>
    <circle cx="70" cy="40" r="2"/>
    <circle cx="62" cy="80" r="1.8"/>
  </g>
  <circle cx="10" cy="10" r="3.2" fill="#8c1c1c" stroke="#e8c96a" stroke-width="1.4"/>
`;

export const SVG_CORNER_TOP_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">${ACANTO_ESQUINA_ILUMINADO}</svg>`;

export const SVG_CORNER_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140"><g transform="translate(0 140) scale(1 -1)">${ACANTO_ESQUINA_ILUMINADO}</g></svg>`;

export const SVG_BAND_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="58">
  <defs>
    <pattern id="__ID__" width="150" height="58" patternUnits="userSpaceOnUse">
      <rect width="150" height="58" fill="#0d2142"/>
      <path d="M0 5.5h150M0 52.5h150" stroke="#c9a227" stroke-width="1.4"/>
      <path d="M0 10h150M0 48h150" stroke="#8a6a18" stroke-width="1" opacity=".75"/>
      <path d="M0 26q18.75-14 37.5 0t37.5 0t37.5 0t37.5 0" fill="none" stroke="#c9a227" stroke-width="1.6"/>
      <path d="M0 34q18.75-12 37.5 0t37.5 0t37.5 0t37.5 0" fill="none" stroke="#8a6a18" stroke-width="1" opacity=".8"/>
      <g fill="#8c1c1c" stroke="#e8c96a" stroke-width="1">
        <path d="M20 25c-5-6 0-12 7-9 0 5-3 9-7 9z"/>
        <path d="M95 33c5-6 12-2 9 5-5 1-8-1-9-5z"/>
      </g>
      <g fill="#21457c" stroke="#e8c96a" stroke-width="1">
        <path d="M50 31c5-6 12-2 9 5-5 1-8-1-9-5z"/>
        <path d="M124 25c-5-6 0-12 7-9 0 5-3 9-7 9z"/>
      </g>
      <g fill="#f0d27a">
        <circle cx="38" cy="18" r="1.7"/>
        <circle cx="112" cy="41" r="1.7"/>
        <circle cx="76" cy="29" r="1.2"/>
      </g>
    </pattern>
  </defs>
  <rect width="100%" height="58" fill="url(#__ID__)"/>
</svg>`;

export const SVG_SIDE_BAND_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="150">
  <defs>
    <pattern id="__ID__" width="58" height="150" patternUnits="userSpaceOnUse">
      <rect width="58" height="150" fill="#0d2142"/>
      <path d="M5.5 0v150M52.5 0v150" stroke="#c9a227" stroke-width="1.4"/>
      <path d="M10 0v150M48 0v150" stroke="#8a6a18" stroke-width="1" opacity=".75"/>
      <path d="M26 0q-14 18.75 0 37.5t0 37.5t0 37.5t0 37.5" fill="none" stroke="#c9a227" stroke-width="1.6"/>
      <path d="M34 0q-12 18.75 0 37.5t0 37.5t0 37.5t0 37.5" fill="none" stroke="#8a6a18" stroke-width="1" opacity=".8"/>
      <g fill="#8c1c1c" stroke="#e8c96a" stroke-width="1">
        <path d="M25 20c-6-5-12 0-9 7 5 0 9-3 9-7z"/>
        <path d="M33 95c6 5 12 0 9-7-5 0-9 3-9 7z"/>
      </g>
      <g fill="#21457c" stroke="#e8c96a" stroke-width="1">
        <path d="M31 50c6 5 12 0 9-7-5 0-9 3-9 7z"/>
        <path d="M25 124c-6-5-12 0-9 7 5 0 9-3 9-7z"/>
      </g>
      <g fill="#f0d27a">
        <circle cx="18" cy="38" r="1.7"/>
        <circle cx="41" cy="112" r="1.7"/>
        <circle cx="29" cy="76" r="1.2"/>
      </g>
    </pattern>
  </defs>
  <rect width="58" height="100%" fill="url(#__ID__)"/>
</svg>`;

/** Dragón heráldico completo, mirando a la derecha. Se reutiliza espejado. */
export const SVG_DRAGON_ILUMINADO =
  `<g stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 30C-4 22 2 12 12 14c6 1 8 7 4 10" fill="none" stroke="#c9a227" stroke-width="4"/>
    <path d="M4 30C44 16 96 14 138 20" fill="none" stroke="#8a6a18" stroke-width="14"/>
    <path d="M4 30C44 16 96 14 138 20" fill="none" stroke="#c9a227" stroke-width="8"/>
    <path d="M6 27C46 14 96 12 136 18" fill="none" stroke="#f3dd9a" stroke-width="1.6" opacity=".8"/>
    <g fill="none" stroke="#8a6a18" stroke-width=".8" opacity=".6">
      <path d="M52 22c2 1 4 1 6 0M69 20c2 1 4 1 6 0M86 19c2 1 4 1 6 0M103 18c2 1 4 1 6 0"/>
    </g>
    <g fill="#dcb84e" stroke="#8a6a18" stroke-width="0.8">
      <path d="M58 17l4-9 4 10z"/>
      <path d="M78 15l4-9 4 10z"/>
      <path d="M98 15l4-8 4 9z"/>
    </g>
    <path d="M98 16C102 2 116-4 134 0c-8 8-14 15-14 24z" fill="#dcb84e" stroke="#8a6a18" stroke-width="1.6"/>
    <path d="M102 16L131 5M106 18L130 11M110 20L129 17" fill="none" stroke="#8a6a18" stroke-width="1"/>
    <path d="M136 20c8-8 22-8 32-2-8 4-10 10-8 15-9 2-19-3-24-9z" fill="#c9a227" stroke="#8a6a18" stroke-width="1.7"/>
    <path d="M158 20c3-6 9-9 15-8-4 3-6 6-6 10" fill="none" stroke="#f0d27a" stroke-width="2"/>
    <path d="M136 17c-4-6-3-13 2-17-1 5 1 9 5 11" fill="none" stroke="#f0d27a" stroke-width="2.2"/>
    <circle cx="150" cy="19" r="1.9" fill="#8c1c1c"/>
    <circle cx="150.6" cy="18.4" r=".6" fill="#f0d27a"/>
    <path d="M168 24c7 1 11 5 13 10-4-1-7-1-10 1" fill="none" stroke="#8c1c1c" stroke-width="2"/>
    <path d="M92 24L89 38M89 38l-6 5M89 38l6 4M89 38l-1 6" fill="none" stroke="#c9a227" stroke-width="2.8"/>
    <path d="M116 22L120 36M120 36l-6 4M120 36l6 3M120 36l-1 6" fill="none" stroke="#c9a227" stroke-width="2.8"/>
    <path d="M20 27l-4-8 8 4z" fill="#8c1c1c" stroke="#e8c96a" stroke-width="1"/>
  </g>`;

export const SVG_FRIEZE_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 96">
  <defs>
    <pattern id="__ID__" width="80" height="96" patternUnits="userSpaceOnUse">
      <rect width="80" height="96" fill="#0a1a33"/>
      <path d="M0 52q20-16 40 0t40 0" fill="none" stroke="#8a6a18" stroke-width="1.5"/>
      <path d="M0 60q20-12 40 0t40 0" fill="none" stroke="#8a6a18" stroke-width="1" opacity=".7"/>
      <path d="M20 53c-6-6-1-13 7-10 0 5-3 9-7 10z" fill="#8c1c1c" stroke="#e8c96a" stroke-width="1"/>
      <path d="M58 58c6-5 12 0 9 7-5 0-9-3-9-7z" fill="#21457c" stroke="#e8c96a" stroke-width="1"/>
      <circle cx="40" cy="48" r="1.6" fill="#f0d27a"/>
    </pattern>
  </defs>
  <rect width="800" height="96" fill="url(#__ID__)"/>
  <path d="M0 5h800M0 10h800M0 86h800M0 91h800" stroke="#c9a227" stroke-width="1.4"/>
  <path d="M0 15h800M0 81h800" stroke="#8a6a18" stroke-width="1" opacity=".75"/>
  <g transform="translate(150 26)">${SVG_DRAGON_ILUMINADO}</g>
  <g transform="translate(800 0) scale(-1 1) translate(150 26)">${SVG_DRAGON_ILUMINADO}</g>
  <g transform="translate(400 48)">
    <circle r="22" fill="#0a1a33" stroke="#8a6a18" stroke-width="2"/>
    <circle r="18" fill="none" stroke="#c9a227" stroke-width="2.4"/>
    <circle r="13.5" fill="#12294d" stroke="#e8c96a" stroke-width="1"/>
    <path d="M0-9l6 9-6 9-6-9z" fill="#8c1c1c" stroke="#f0d27a" stroke-width="1.2"/>
    <g fill="#e8c96a">
      <circle cx="0" cy="-18" r="1.8"/>
      <circle cx="0" cy="18" r="1.8"/>
      <circle cx="-18" cy="0" r="1.8"/>
      <circle cx="18" cy="0" r="1.8"/>
    </g>
    <g stroke="#c9a227" stroke-width="1.2">
      <path d="M-30-30l8 8M30-30l-8 8M-30 30l8-8M30 30l-8-8"/>
    </g>
  </g>
</svg>`;

export const SVG_MEDALLION_ILUMINADO =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <defs>
    <radialGradient id="__ID__" cx="38%" cy="30%" r="78%">
      <stop offset="0" stop-color="#2f5c9c"/>
      <stop offset=".55" stop-color="#173a6c"/>
      <stop offset="1" stop-color="#0a1a33"/>
    </radialGradient>
    <linearGradient id="__ID__gold" gradientUnits="userSpaceOnUse" x1="28" y1="28" x2="108" y2="98">
      <stop offset="0" stop-color="#fff8e0"/>
      <stop offset=".28" stop-color="#f9e7a8"/>
      <stop offset=".58" stop-color="#eed27a"/>
      <stop offset=".82" stop-color="#dcb84e"/>
      <stop offset="1" stop-color="#c19a2c"/>
    </linearGradient>
    <linearGradient id="__ID__red" gradientUnits="userSpaceOnUse" x1="54" y1="92" x2="94" y2="116">
      <stop offset="0" stop-color="#c04a4a"/>
      <stop offset=".5" stop-color="#962828"/>
      <stop offset="1" stop-color="#5e1212"/>
    </linearGradient>
    <clipPath id="__ID__clip"><circle cx="70" cy="70" r="54"/></clipPath>
  </defs>

  <circle cx="70" cy="70" r="68" fill="#081426" stroke="#8a6a18" stroke-width="2.4"/>
  <circle cx="70" cy="70" r="64.5" fill="none" stroke="#c9a227" stroke-width="2.6"/>
  <circle cx="70" cy="70" r="60.5" fill="none" stroke="#f3dd9a" stroke-width="0.9" opacity=".8"/>
  <circle cx="70" cy="70" r="57.5" fill="none" stroke="#8c1c1c" stroke-width="4.6" stroke-dasharray="5.6 5.6"/>
  <circle cx="70" cy="70" r="66.2" fill="none" stroke="#f0d27a" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 26.01"/>
  <circle cx="70" cy="70" r="54" fill="url(#__ID__)" stroke="#c9a227" stroke-width="2"/>

  <g clip-path="url(#__ID__clip)" stroke-linecap="round" stroke-linejoin="round">
    <g fill="none" stroke="#7ea6d8" stroke-width="1" opacity=".2">
      <path d="M26 80c6-6 13-7 18-2 3 4 2 9-2 10-3 1-6-1-6-4"/>
      <path d="M102 90c6-3 11-1 12 4 1 4-2 7-6 7"/>
      <path d="M40 112c5-3 10-2 13 2"/>
    </g>

    <!-- Cola roja enrollada -->
    <path d="M84 84c2 4 5 7 6 11 1 5-1 10-6 13-6 4-16 5-24 2-7-3-10-9-7-14 3-5 11-6 16-2 4 3 4 8 0 10-3 2-7 1-8-2-1-2 1-4 3-4"
          fill="none" stroke="#4a0d0d" stroke-width="10.2"/>
    <path d="M84 84c2 4 5 7 6 11 1 5-1 10-6 13-6 4-16 5-24 2-7-3-10-9-7-14 3-5 11-6 16-2 4 3 4 8 0 10-3 2-7 1-8-2-1-2 1-4 3-4"
          fill="none" stroke="url(#__ID__red)" stroke-width="7"/>
    <path d="M86 89c4 4 5 9 3 13-3 5-10 7-16 6" fill="none" stroke="#e08a7a" stroke-width=".9" opacity=".38"/>
    <path d="M61 102c-2 2-2 5 0 7 2-2 4-3 6-3-2-2-4-3-6-4z" fill="#962828" stroke="#4a0d0d" stroke-width=".7"/>
    <!-- Sombra bajo las patas -->
    <ellipse cx="70" cy="98" rx="24" ry="4.5" fill="#4a0d0d" opacity=".28"/>

    <!-- Dragón galés -->
    <g transform="translate(70 67) scale(0.15) translate(-350 -250)">
      <path d="M669.5 56.4c-5 34.8 0 85.2 8.6 101.7a52 52 0 0 1-28-24.2l-12.2 38c26 52.7-41.5 94.1-97.6 97 34.3 18.6 79 41.7 79 53.9-13.5 5-21.7-9.4-32.5-14.1 11.6 30.3 4.4 52.7-1.6 82.7-5.9 7 0 11.6 2.4 17.4l16.1 6.3 2.6 2.4s11.4.5 14.6 16.4c-7.6-9.2-18-6.3-18-6.3l-3.9 2.6-9.1-5.4c-10-6.7-20.3-6.4-31.3-1.6a17 17 0 0 1-16.7.5c-6.2-6.7-19.6-.8-19.8-.8l-14.4 9.4-3.6-.8c-.3 0-9.2-.2-21 7.4 3.2-16 14.7-15.7 14.7-15.7-1-3.3 1.4-2.8 2-4.2 3.9-4.2 12-3.5 17.8-5.2l-33.9-1.6.5-1.5c-7.4-.7-13.2-1-17.4 6-.5-11.7 9.3-13.8 15.6-16.5 2.8-4.4 9-3.6 14.9-3l30 11.1c-2.4-.8-38.1-16.1-38.1-16.1-1.8-2.7.5-4.2.5-4.5s-9.6-6-16.4.5c1.3-13.8 17.7-10.1 17.7-10.1 1-4.5 5.4-3.9 7.6-1.9l12.8 12.6 12 7.5c11.1 5 23 3.1 32.8-12.8-3.3-8.2-1.8-11.8 5.8-16.7-2-5.4-1.3-11 1-16.4-3.3-5-5.3-18.7-2-22-7.6-2.6-10.5-10-11-10-6.9 1.3-12.8-1-15.7-3.7a24 24 0 0 1-26.6-4c-12.2 4.2-23.3 1.3-29.2-3.9-9.4 2.3-24-4.4-26.6-12-5.4 0-10.9-6-16.7-5.4-4.8 7.8-6 7-13.3 13.5-7.4 7.7-4.8 20.8 1 26.9l27.4 10.4c20.9 1.2 25.9 13.2 25.6 24.8-7.9-2.3-8.2-3.6-12-3.9l-16.2-5.7a120 120 0 0 1-74.9 55c6.6 3 13 2 19.6 2.9l7 4.2c10.2 2 17.3 5.3 17.3 14.8-6.8-7.5-13.4-7.3-18.8-3.6-10.8 4.5-17-5.4-25.6-8.1-7.2-5.2-14.3-3-20.6.3-7.1-4.7-15.3-2.3-23.5-1.4-10.2 1-21.8 3.7-26.9 9.4-3.3 2.7-4.7-1.3-5-1-11.6-3.8-16.9 6.5-16.9 6.5-2.8-11.9 3.3-14.5 9.7-16.2l-13-7.5c-.3-1.5-1.3-1.8 1.2-2.4-5-3.3-10.2-.7-15.9 4.5.5-11 14-17.7 19.6-14.1 4-3 11.5-3.6 17 1a26 26 0 0 0 21.6 3.4 20 20 0 0 0-16-12c-6.6-1.6-14.4-4-12.2-8-4.1-6-10-4.1-16.7.7 2.4-13.4 16.6-12 20.4-9.1 1.3-4.2 5.7-5.1 9.4-.8 5.7 1.5 6.6 5.6 9.9 8.3 6.4 6.6 16.3 10 24.5 11.3a53 53 0 0 1 25.6-5.3c1.7-7.4 6.6-9 13-9-.2-6.7 3.1-9.7 9.4-12.6 0 0-10-.9-10.7-7.3-16.7-.1-27.8-2.4-29.2-13.3-15.3-4.8-24.9-16.3-18.8-28.7a26 26 0 0 1-19 0c-10.6 9.3-27 20.5-37 14.3a73 73 0 0 1-16.3 10.7c-1.3 11.8-10.4 26.4-10.4 26.4-4.5-11.4-13.1-23.9-12.5-35-15.3 19.8-24.2 25.7-36.3 38.6a75 75 0 0 0-18.2 35c7.3 4.2 16.7 3.5 25 5.2 2.3 3 1.7 1.7 2.6 2.6 9 .2 15.5 5.1 15.4 14.4-8-8.2-16-3.2-16-3.2-6.4 5.4-14.7 3-22.6 0-6.9-7.3-16.9-11.5-25.3-5.2-10.2 8.3-14.8-4.4-30.5 4.4-11.3 10.3-26.8 11.2-31 5 0 0-7.9-3-18.9 8.6 3.2-19 14.9-17.2 14.9-17.2l-.5-6-4.5-1.6c-7.9-3.5-17.7-2.6-22.1 1 3-12.4 14.6-12.5 23.2-11.1l4.7-5.3c-3.6-1.4-2.8-3.8-1.8-6.2-4.8-4.8-8.4-5.8-14.4-.8 1.9-12.1 13.4-11.3 21.4-6 4.3-2.7 13.7 2.4 19.8 6 18.6 6.2 30.1 7 48.8-17 .2-11.4.9-15.8 11-22.7-3.9-7-1.8-13.9 7.8-17.2-3.4-3.2-.8-8 1.6-12.9-13.8-.6-29.2.8-40 4.6a70 70 0 0 1-15.9 29.4c.2-28.3-16.1-48.4-36-69.6-22.7-15-32.8-45-34.7-54.8-4.2 11-7 12.8-7 13-5 5.5-1.6 18-12.1 18.3-9.8 12-21.6 5-21.6 5 11.2-1.6 13-6.1 15.2-13.6-7-1.7-1-7.5 2.6-9.7 2.1-.4 7.6-14.2 11.2-13.8l4.4-41c-9-3.7-15-9.5-14.3-19.5-3.3-4.3-5.6-10.5-1-12.8-2-5.1-4.4-10.8-11.8-12.8 17.2-3 19.3 7.5 23.7 8.4 5 3 8.6 20.3 14.6 29.4-4.6-15-2.2-25 2.4-38 0-7-3-14-10-18 14.7-.4 20.7 14.8 21.2 15.3 9.3 12-3.2 20.5.8 25.9 2.9-2.2 4.3-7.2 8.6-6.5 3.6-4 6.3-8.2 6-17 9 5.1 6.8 12.7 4 20 .5 11.2-1.1 14.2-8.4 18-7.4 4.5-8.7 8-7.9 13.4 9 9.5 10.7 38.9 10.7 38.9a16 16 0 0 1 11.8 16.7c8.4-.8 16.2 5.8 17.5 11.7 5-4.7 12-.3 17 4.7 1.6-2.6 5.3-3.8 9.3-2.3 0-4.6 2.6-7.5 6.8-11.3-10.1-7.8-13-27.2-1.6-37.8-2.2-14.2 2-27.6 9.4-29.2-2.3-15.6 7-20.6 10.7-24.3-2.4-7.1 5.5-20.2 10-20.3-4.5-7.5 3.7-21 10.4-22l-4.5-10.4s-21.2 3.2-25 22.7c-2.6-4-5.2-10.2-5.2-10.2s-8.5 22.7-8.8 22.2c-7.3-4.4-4-15.4-4-15.4-5.3-5.8-4.4-13.2-6.5-19.8L79.3 107s6.8 12.5 6.8 12.2c-7 .2-41.6-29.3-48.3-54.5 17.7 14 36.6 17.6 56.6 21.7l-15.9 7.8c55 4.7 112-5.5 111.7-5.7-6.2-12.9-26.4-12.8-26.4-12.8v8.6l-5.4-4-.3 6.6L154 84l-1.3 5.5-4.1-2.9-1.9 5-4.7-3.7s-3.9 0-4.1-.5c-2.6-13-15-13.3-15-13.3-14.4-1.8-25.7 1.2-38.5 1.8 18.9-23.7 44.8-21.5 69.6-24 1.8-10.5 11.1-13.6 22-15.1l51 2.6c6.6-8.6 27-12.2 27-12.2 7-3.6 15-2 21.4-10.7-1.7 11.8-1.8 14.2-2.7 21.3l6.6.8c-6 3.9-13.8 9.3-19.7 13-6.6 10-5.4 10.2-2.5 15.5l6 10.4c10.1 3.1 17.5 7.4 19.8 14-11-1.2-19 .8-18.8 5.6.3 3.5 8.6 5 12 7.1a24 24 0 0 1 8.6 18.4c-8-.4-18.6-12.5-24.2-1.3-2.7 5.5.3 13 7.3 15.4 12.9 3.6 14 21.2 13.8 21.2s-28.3-18.7-26.9-1.3c-.4 7.7 3.2 9.5 6 11.7 8.4 3.1 15.6 6.7 14.7 15.7-12.1-4.4-17.9-1-19.4 6l4.7 13.5 49-9.9c7.2-6.5 10.5-17.3 9.7-29 .9-17.3-5.3-32.6 16.7-51.9a900 900 0 0 1 145.1-97.3C470.6 33.1 463 66 490.7 68.1c9 .1 106.6-41 106.6-41-34 24.8-73 59.4-27.7 74.4-41.6 13-76.1 55-45.9 89-21.6-6.2-50 7.7-55 23.5 24.6-.2 46.8-1.6 70.2 6.5 0 0 65.2 13 69.6-15.7-34.8 7.5-60.6 4-61.8-27.4.3-27 40.8-42 75.2-21.9l10.6-21.9c-12.6 1.6-24 3.7-37 .6 26.5-25.1 51.5-50 74-77.8" fill="url(#__ID__gold)" stroke="#6b4a14" stroke-width="10" stroke-linejoin="round"/>
      <path d="m174.2 55 12 2.2s-8.4 11.4-12-2.2" fill="#fff3c4" stroke="#6b4a14" stroke-width="5" stroke-linejoin="round"/>
    </g>

    <!-- Volumen -->
    <path d="M46 44c2 8 5 16 10 23 4 5 9 9 15 11" fill="none" stroke="#8a6a18" stroke-width="3.4" opacity=".16"/>
    <path d="M55 68c6 1 12 4 17 8 4 4 7 8 8 13" fill="none" stroke="#fff8e0" stroke-width="4" opacity=".22"/>

    <!-- Estructura del ala -->
    <g fill="none" stroke="#8a6a18" stroke-width="1.1" opacity=".8">
      <path d="M64 61C72 51 82 40 94 30"/>
      <path d="M64 62C74 55 84 48 97 41"/>
      <path d="M65 64C73 59 81 55 92 50"/>
      <path d="M66 66C72 62 79 59 86 56"/>
    </g>
    <path d="M63 60C72 50 83 39 95 29" fill="none" stroke="#fff8e0" stroke-width="1.1" opacity=".55"/>

    <!-- Escamas -->
    <g fill="none" stroke="#a07a18" stroke-width=".8" opacity=".65">
      <path d="M53 52c2 1 3 2 4 4M56 58c2 1 3 2 4 4M59 64c2 1 3 2 4 4"/>
      <path d="M65 69c2 1 4 1 6 0M71 72c2 1 4 1 6 0M78 75c2 1 4 1 5 0M85 77c2 1 3 1 5 0"/>
      <path d="M70 80c2 1 4 1 6 0M77 82c2 1 3 1 5 0"/>
    </g>
    <g fill="none" stroke="#fff3c4" stroke-width="1.15" opacity=".55">
      <path d="M60 74c4 1 7 3 9 6M63 79c4 1 7 3 9 6M67 84c3 1 6 3 8 5"/>
    </g>

    <!-- Cresta del cuello -->
    <g fill="#eed27a" stroke="#6b4a14" stroke-width=".65">
      <path d="M54 49c3-3 6-4 9-4-2 3-3 6-3 9z"/>
      <path d="M58 55c3-3 6-4 9-4-2 3-3 6-3 9z"/>
      <path d="M63 61c3-3 6-4 9-4-2 3-3 6-3 9z"/>
    </g>

    <!-- Cuerno, ojo, boca -->
    <path d="M47 36c-1-5 1-9 5-12-2 4-2 8 0 11z" fill="#f2dc96" stroke="#6b4a14" stroke-width=".75"/>
    <circle cx="43.6" cy="37.8" r=".8" fill="#3a1a08"/>
    <path d="M41 36c1-1 3-1 4 0" fill="none" stroke="#6b4a14" stroke-width=".65"/>
    <path d="M30 46c2 0 4 1 5 2-2 0-4 0-5-1z" fill="#c04a4a" stroke="#6b4a14" stroke-width=".5"/>
    <path d="M38 49c-1 2-2 3-4 3 1-2 2-3 4-4z" fill="#eed27a" stroke="#6b4a14" stroke-width=".55"/>
    <circle cx="29.5" cy="42" r=".55" fill="#6b4a14"/>
    <path d="M95 29c2-2 4-2 5-1-1 2-2 3-3 4z" fill="#fff3c4" stroke="#6b4a14" stroke-width=".7"/>
  </g>

  <path d="M70 13l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f3dd9a"/>
  <g fill="#f0d27a">
    <circle cx="25" cy="92" r="1.3"/>
    <circle cx="112" cy="88" r="1.3"/>
    <circle cx="100" cy="21" r="1.1"/>
  </g>
</svg>`;

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
    bg: "#0a1729",
    containerBg: "#102443",
    containerShadow: "0 0 40px rgba(0,0,0,0.55)",
    printBg: "#0a1729",
    text: "#f2e4c0",
    subtitle: "#c9b78d",
    accent: "#e8c96a",
    linksBg: "rgba(201,162,39,0.10)",
    linksBorder: "#8a6a18",
    linkInline: "#f0cf7a",
    linkDotted: "#b08d2a",
    fontBody: "'EB Garamond', Georgia, 'Times New Roman', serif",
    fontHeading: "'Cinzel Decorative', Georgia, serif",
    headingWeight: "700",
    h1LetterSpacing: "3px",
    uppercaseHeadings: false,
    dropCap: true,
    ornament: true,
    bodyTexture:
      "radial-gradient(ellipse at 50% 14%, rgba(47,92,156,0.55) 0, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(6,16,32,0.85) 0, transparent 60%), repeating-linear-gradient(0deg, rgba(201,162,39,0.022) 0px, rgba(201,162,39,0.022) 1px, transparent 1px, transparent 6px)",
    containerTexture:
      "radial-gradient(ellipse at 50% 12%, rgba(47,92,156,0.45) 0, transparent 58%), radial-gradient(ellipse at 50% 100%, rgba(6,16,32,0.7) 0, transparent 55%), repeating-linear-gradient(0deg, rgba(201,162,39,0.018) 0px, rgba(201,162,39,0.018) 1px, transparent 1px, transparent 7px)",
    fontFamilies: ["EB Garamond", "Cinzel Decorative"],
    dark: true,
    watermarkSvg: SVG_WATERMARK_ILUMINADO,
    watermarkOpacity: 0.05,
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
    friezeSvg: SVG_FRIEZE_ILUMINADO,
    emblemSvg: SVG_MEDALLION_ILUMINADO,
    emblemSize: 140,
    decor: {
      band: 58,
      cornerTop: 140,
      cornerBottom: { w: 150, h: 125 },
      medallion: { w: 140, h: 140 },
      frieze: 96,
      frame: { top: 156, side: 132, bottom: 156 },
    },
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
  // El iluminado es azul lapislázuli en pantalla y en PDF, pero en papel
  // (DOCX/ODT/DOC/EPUB) se invierte a vitela clara conservando azul y oro.
  if (th.id === "iluminado") {
    return {
      id: th.id,
      paperBg: "#f4e8c9",
      text: "#2a2118",
      subtitle: "#6b5a3e",
      accent: "#8c1c1c",
      linkInline: "#1f3f7a",
      linkDotted: "#b08d2a",
      linksBg: "#f7edd4",
      linksBorder: "#c9b17a",
      fontBody: th.fontBody,
      fontHeading: th.fontHeading,
      headingWeight: th.headingWeight,
      uppercaseHeadings: false,
      fontFamilies: th.fontFamilies,
    };
  }
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
      `.cover-emblem svg { width: ${th.emblemSize ?? 56}px; height: ${th.emblemSize ?? 56}px; opacity: 0.95; }`
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
    const band = th.decor?.band ?? 64;
    const cornerTop = th.decor?.cornerTop ?? 128;
    const cornerBottom = th.decor?.cornerBottom ?? { w: 150, h: 125 };
    const medallion = th.decor?.medallion ?? { w: 180, h: 100 };
    const frieze = th.decor?.frieze ?? band;
    const frame = th.decor?.frame ?? { top: 136, side: 118, bottom: 124 };
    const frameInset = Math.round(band / 2) + 16;
    rules.push(
      `.page-wrap { position: relative; max-width: 800px; margin: 0 auto; }`,
      `.page-decor { position: absolute; inset: 0; z-index: 20; pointer-events: none; color: ${th.linkDotted}; }`,
      `.page-decor::before { content: ""; position: absolute; inset: ${frameInset}px; border: 2px solid ${th.linkDotted}; opacity: 0.6; pointer-events: none; }`,
      `.page-decor::after { content: ""; position: absolute; inset: ${frameInset + 8}px; border: 1px solid ${th.linkDotted}; opacity: 0.35; pointer-events: none; }`,
      `body { position: relative; }`,
      `.container { padding: ${frame.top}px ${frame.side}px ${frame.bottom}px; }`,
      `.container.mobile { padding: 24px 18px; }`,
      `.decor-band { position: absolute; color: ${th.linkDotted}; }`,
      `.decor-band svg { display: block; width: 100%; height: 100%; }`,
      `.decor-top { top: 0; left: 0; right: 0; height: ${band}px; }`,
      `.decor-bottom { bottom: 0; left: 0; right: 0; height: ${frieze}px; transform: scaleY(-1); }`,
      `.decor-frieze { bottom: 0; left: 0; right: 0; height: ${frieze}px; }`,
      `.decor-left { top: 0; bottom: 0; left: 0; width: ${band}px; }`,
      `.decor-right { top: 0; bottom: 0; right: 0; width: ${band}px; transform: scaleX(-1); }`,
      `.decor-corner { position: absolute; width: ${cornerTop}px; height: ${cornerTop}px; }`,
      `.decor-corner svg { width: 100%; height: 100%; }`,
      `.decor-bl, .decor-br { width: ${cornerBottom.w}px; height: ${cornerBottom.h}px; }`,
      `.decor-tl { top: 0; left: 0; }`,
      `.decor-tr { top: 0; right: 0; transform: scaleX(-1); }`,
      `.decor-bl { bottom: 0; left: 0; }`,
      `.decor-br { bottom: 0; right: 0; transform: scaleX(-1); }`,
      `.decor-medallion { position: absolute; left: 50%; width: ${medallion.w}px; height: ${medallion.h}px; transform: translateX(-50%); }`,
      `.decor-top-medallion { top: 6px; }`,
      `.decor-bottom-medallion { bottom: 6px; }`,
      `.container { border: none; outline: none; box-shadow: ${th.containerShadow}; }`,
      `.cover { border-bottom: 3px double ${th.linkDotted}; padding-top: 120px; }`,
      `@media screen { .cover { padding-top: 0; } }`,
      `.passage-number-center::after, .passage-number-left::after { content: ""; display: block; width: 64px; height: 1px; margin: 6px auto 0; background: ${th.linkDotted}; opacity: 0.75; }`,
      `.passage-number-left::after { margin-left: 0; }`,
      `.page-flow { width: 100%; border-collapse: collapse; }`,
      `.page-flow thead, .page-flow tfoot { display: none; }`,
      `.page-flow .flow-left, .page-flow .flow-right { width: 0; padding: 0; }`,
      `.page-flow .flow-main { padding: 0; vertical-align: top; }`,
      `@media print { .page-decor { position: fixed; } .page-wrap { max-width: none; margin: 0; } html, body { background: ${th.printBg}; } .container { background: transparent; box-shadow: none; padding: 0; max-width: none; } .container.mobile { padding: 24px 18px; } .page-flow thead { display: table-header-group; } .page-flow tfoot { display: table-footer-group; } .page-flow thead td { height: ${frame.top}px; padding: 0; font-size: 0; line-height: 0; } .page-flow tfoot td { height: ${frame.bottom}px; padding: 0; font-size: 0; line-height: 0; } .page-flow .flow-left, .page-flow .flow-right { width: ${frame.side}px; } }`
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
      ? ` background: ${th.accent}; padding: 2px 8px; border-radius: 3px; margin-right: 6px;`
      : "";
    const dropCapColor = th.dropCapBoxed ? th.containerBg : th.accent;
    rules.push(
      `.passage-content::first-letter { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; font-size: 2.6em; line-height: 0.85; float: left; padding: 3px 6px 0 0; color: ${dropCapColor};${boxed} }`
    );
  }
  if (th.id === "iluminado") {
    rules.push(
      `body { background-image: ${th.bodyTexture}; background-attachment: fixed; }`,
      `@media print { body { background: radial-gradient(ellipse at 50% 12%, #1b3d70 0%, #102544 46%, #081326 100%); } }`,
      `.cover { padding: 6px 20px 56px; border-bottom: none; }`,
      `.cover h1 { font-size: 31px; letter-spacing: 2px; color: #f0d27a; text-shadow: 0 3px 10px rgba(0,0,0,0.65); overflow-wrap: break-word; hyphens: auto; }`,
      `.cover .subtitle { color: #c9b78d; letter-spacing: 2px; }`,
      `.cover-emblem { filter: drop-shadow(0 8px 18px rgba(0,0,0,0.55)); }`,
      `.cover-ornament::before, .cover-ornament::after { background: #c9a227; opacity: 0.7; }`,
      `.cover-ornament span { background: #8c1c1c; box-shadow: 0 0 0 2px #c9a227; }`,
      `.passage-number-left, .passage-number-center { color: #f0d27a; letter-spacing: 1.4px; }`,
      `.passage { break-inside: avoid; }`,
      `.passage-number-left::before { content: "❖"; color: #8c1c1c; margin-right: 8px; }`,
      `.passage-number-center::before { content: "❖ "; color: #8c1c1c; }`,
      `.passage-links { background: rgba(201,162,39,0.08); border: 1px solid #8a6a18; border-left: 4px solid #8c1c1c; border-radius: 0; box-shadow: inset 0 0 0 1px rgba(232,201,106,0.18); }`,
      `.passage-links strong { color: #e8c96a; letter-spacing: 2px; text-transform: uppercase; font-size: 11px; }`,
      `.passage-links a { color: #f0cf7a; }`,
      `.passage-divider { opacity: 0.9; }`,
      `.container .passage-content::first-letter { background: linear-gradient(150deg, #f7e3a4 0%, #e8c96a 38%, #c9a227 70%, #8a6a18 100%); color: #0c1c36; border: 2px solid #8c1c1c; box-shadow: 3px 3px 0 rgba(140,28,28,0.9); padding: 4px 9px 5px; margin-right: 8px; }`,
      `.start-marker, .end-marker { letter-spacing: 1px; }`
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
    background: "#0a1729",
    foreground: "#f2e4c0",
    primary: "#e8c96a",
    primaryForeground: "#0a1729",
    secondary: "#132b52",
    secondaryForeground: "#f2e4c0",
    muted: "#132b52",
    mutedForeground: "#c9b78d",
    accent: "#1b3d70",
    accentForeground: "#f2e4c0",
    border: "#8a6a18",
    input: "#132b52",
    ring: "#c9a227",
    card: "#102443",
    cardForeground: "#f2e4c0",
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
    const band = th.decor?.band ?? 64;
    const cornerTop = th.decor?.cornerTop ?? 128;
    const cornerBottom = th.decor?.cornerBottom ?? { w: 150, h: 125 };
    const medallion = th.decor?.medallion ?? { w: 180, h: 100 };
    const frieze = th.decor?.frieze ?? band;
    const frame = th.decor?.frame ?? { top: 136, side: 118, bottom: 124 };
    layer(th.bandSvg, "top left", "repeat-x", `150px ${band}px`);
    if (th.friezeSvg) {
      layer(th.friezeSvg, "bottom left", "repeat-x", `800px ${frieze}px`);
    } else {
      layer(th.bandSvg, "bottom left", "repeat-x", `150px ${band}px`);
    }
    if (th.sideBandSvg) {
      layer(th.sideBandSvg, "top left", "repeat-y", `${band}px 150px`);
      layer(th.sideBandSvg, "top right", "repeat-y", `${band}px 150px`);
    }
    if (th.cornerTopSvg) {
      layer(th.cornerTopSvg, "top left", "no-repeat", `${cornerTop}px ${cornerTop}px`);
      layer(th.cornerTopSvg, "top right", "no-repeat", `${cornerTop}px ${cornerTop}px`);
    }
    layer(th.cornerSvg, "bottom left", "no-repeat", `${cornerBottom.w}px ${cornerBottom.h}px`);
    layer(th.cornerSvg, "bottom right", "no-repeat", `${cornerBottom.w}px ${cornerBottom.h}px`);
    if (th.medallionSvg) {
      layer(th.medallionSvg, "top center", "no-repeat", `${medallion.w}px ${medallion.h}px`);
      layer(th.medallionSvg, "bottom center", "no-repeat", `${medallion.w}px ${medallion.h}px`);
    }
    cornerRule = `
[data-pv-theme="${theme}"] .pv-page {
  background-image: ${images.join(", ")};
  background-position: ${positions.join(", ")};
  background-repeat: ${repeats.join(", ")};
  background-size: ${sizes.join(", ")};
  padding: ${frame.top}px ${frame.side}px ${frame.bottom}px;
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
