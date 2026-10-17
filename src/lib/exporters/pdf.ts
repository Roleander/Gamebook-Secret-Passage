import { db } from "@/lib/db";
import { findPassageLinks } from "@/lib/reference-links";
import { PDF_THEMES, pdfThemeRules, type PdfTheme, type ThemeId } from "@/lib/exporters/themes";
import { FONTS_DATA } from "@/lib/exporters/fonts-data";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isEndpoint: boolean;
  outgoingLinks: {
    target: { number: number };
    linkText: string | null;
  }[];
}

export async function generatePDF(projectId: string, readingMode = false, theme: ThemeId = "clasico"): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      passages: {
        include: {
          outgoingLinks: {
            include: { target: { select: { number: true } } },
          },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!project) throw new Error("Proyecto no encontrado");
  return buildPrintHtml(project, readingMode, theme);
}

function buildLinkMap(passages: Passage[]): Set<number> {
  return new Set(passages.map(p => p.number));
}

function linkifyContent(content: string, passageNumber: number, passageNumbers: Set<number>, escapeHtml: (t: string) => string, th: PdfTheme): string {
  const links = findPassageLinks(content, passageNumbers, passageNumber);
  let result = "";
  let lastIndex = 0;

  for (const link of links) {
    result += escapeHtml(content.slice(lastIndex, link.start));
    result += `<a href="#passage${link.target}" style="color:${th.linkInline};text-decoration:none;border-bottom:1px dotted ${th.linkDotted}">${escapeHtml(link.text)}</a>`;
    lastIndex = link.end;
  }
  result += escapeHtml(content.slice(lastIndex));
  return result;
}

function buildFontFaces(th: PdfTheme): string {
  return FONTS_DATA.filter((f) => th.fontFamilies.includes(f.family))
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-style: ${f.style}; font-weight: ${f.weight}; src: url("data:font/woff2;base64,${f.base64}") format('woff2'); unicode-range: ${f.unicodeRange}; }`
    )
    .join("\n    ");
}

export function buildPrintHtml(project: { title: string; passages: Passage[] }, readingMode: boolean, theme: ThemeId = "clasico"): string {
  const th = PDF_THEMES[theme] ?? PDF_THEMES.clasico;
  const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const passageNumbers = buildLinkMap(project.passages);

  const themedRules = pdfThemeRules(th);
  const extras =
    th.id === "clasico"
      ? ""
      : `\n    ${[buildFontFaces(th), themedRules].filter(Boolean).join("\n    ")}`;
  const ornament =
    th.ornament ? `\n      <p class="cover-ornament"><span></span></p>` : "";

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${th.fontBody};
      font-size: 14px;
      line-height: 1.8;
      color: ${th.text};
      background: ${th.bg};
      padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; background: ${th.containerBg}; padding: 40px; box-shadow: ${th.containerShadow}; }
    .cover { text-align: center; padding: 80px 20px; border-bottom: 3px double ${th.accent}; margin-bottom: 40px; }
    .cover h1 { font-size: 32px; color: ${th.accent}; margin-bottom: 10px; letter-spacing: ${th.h1LetterSpacing}; }
    .cover .subtitle { font-size: 14px; color: ${th.subtitle}; font-style: italic; }
    .passage { margin-bottom: 30px; padding-bottom: 20px; page-break-inside: avoid; }
    .passage-number-center {
      text-align: center; font-size: 13px; font-weight: bold;
      color: ${th.accent}; margin-bottom: 8px;
    }
    .passage-number-left {
      font-size: 13px; font-weight: bold; color: ${th.accent}; margin-bottom: 8px;
    }
    .passage-content { text-align: justify; margin-bottom: 15px; white-space: pre-wrap; }
    @media screen { .passage-content { scroll-margin-top: 36px; } }
    .passage-links { margin-top: 15px; padding: 10px 15px; background: ${th.linksBg}; border: 1px solid ${th.linksBorder}; border-radius: 4px; }
    .passage-links strong { color: ${th.accent}; }
    .passage-links a { color: ${th.accent}; text-decoration: none; font-weight: bold; }
    .start-marker { color: #22c55e; font-size: 11px; font-weight: bold; }
    .end-marker { color: #ef4444; font-size: 11px; font-weight: bold; }
    @media print { body { background: ${th.printBg}; padding: 0; } .container { box-shadow: none; padding: 0; } .passage { page-break-inside: avoid; } }${extras}
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <h1>${escapeHtml(project.title)}</h1>
      <p class="subtitle">Librojuego generado por Secret Passage</p>${ornament}
    </div>
`;

  project.passages.forEach((passage) => {
    const markers = [];
    if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
    if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    const numClass = readingMode ? "passage-number-center" : "passage-number-left";

    if (readingMode) {
      html += `    <div class="passage">\n`;
      html += `      <div class="${numClass}">${passage.number}${markerStr}</div>\n`;
      html += `      <div class="passage-content" id="passage${passage.number}">${linkifyContent(passage.content, passage.number, passageNumbers, escapeHtml, th)}</div>\n`;
      html += `    </div>\n`;
    } else {
      html += `    <div class="passage">\n`;
      html += `      <div class="${numClass}">Pasaje ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""}${markerStr}</div>\n`;
      html += `      <div class="passage-content" id="passage${passage.number}">${linkifyContent(passage.content, passage.number, passageNumbers, escapeHtml, th)}</div>\n`;
      if (passage.outgoingLinks.length > 0) {
        html += `      <div class="passage-links"><strong>Opciones:</strong><br>\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          html += `        → <a href="#passage${link.target.number}">${escapeHtml(text)}</a><br>\n`;
        });
        html += `      </div>\n`;
      }
      html += `    </div>\n`;
    }
  });

  html += `  </div>\n</body>\n</html>`;
  return html;
}
