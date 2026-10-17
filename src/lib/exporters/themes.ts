import { FONT_FILES } from "./font-files";

export type ThemeId = "clasico" | "grimorio" | "papiro" | "pergamino";

export const THEME_IDS: ThemeId[] = ["clasico", "grimorio", "papiro", "pergamino"];
export const DEFAULT_THEME: ThemeId = "clasico";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as string[]).includes(value);
}

export const THEME_SWATCH: Record<ThemeId, string> = {
  clasico: "#f5f0e8",
  grimorio: "#1d1712",
  papiro: "#f1e6c4",
  pergamino: "#f6efdd",
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
}

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
      "radial-gradient(ellipse at top, rgba(201,169,110,0.06), transparent 65%), repeating-linear-gradient(45deg, rgba(0,0,0,0.14) 0px, transparent 2px, transparent 7px)",
    containerTexture:
      "radial-gradient(ellipse at center, rgba(201,169,110,0.05) 0, transparent 70%), repeating-linear-gradient(45deg, rgba(0,0,0,0.10) 0px, transparent 3px, transparent 8px)",
    fontFamilies: ["EB Garamond", "UnifrakturMaguntia"],
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
      "repeating-linear-gradient(90deg, rgba(120,90,40,0.06) 0px, rgba(120,90,40,0.06) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(0deg, rgba(120,90,40,0.05) 0px, transparent 1px, transparent 4px)",
    containerTexture:
      "repeating-linear-gradient(90deg, rgba(120,90,40,0.055) 0px, rgba(120,90,40,0.055) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(0deg, rgba(120,90,40,0.045) 0px, transparent 1px, transparent 4px)",
    fontFamilies: ["EB Garamond", "Cinzel"],
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
  },
};

export function pdfThemeRules(th: PdfTheme): string {
  if (th.id === "clasico") return "";
  const rules: string[] = [];
  if (th.bodyTexture) {
    rules.push(`body { background-image: ${th.bodyTexture}; }`);
  }
  if (th.containerTexture) {
    rules.push(
      `.container { background-image: ${th.containerTexture}; border: 1px solid ${th.linksBorder}; }`
    );
  }
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
  if (th.ornament) {
    rules.push(
      `.cover-ornament { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }`,
      `.cover-ornament::before, .cover-ornament::after { content: ""; height: 1px; width: 80px; background: ${th.accent}; opacity: 0.55; }`,
      `.cover-ornament span { width: 8px; height: 8px; background: ${th.accent}; transform: rotate(45deg); }`
    );
  }
  if (th.dropCap) {
    rules.push(
      `.passage-content::first-letter { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; font-size: 2.6em; line-height: 0.85; float: left; padding: 3px 6px 0 0; color: ${th.accent}; }`
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
  const texture = th.containerTexture || th.bodyTexture;
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
${headRule}${upperRule}`;
}
