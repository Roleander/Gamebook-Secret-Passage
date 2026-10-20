import { db } from "@/lib/db";
import { findPassageLinks } from "@/lib/reference-links";
import { PDF_THEMES, officeTheme, type OfficeTheme, type ThemeId } from "@/lib/exporters/themes";
import { FONTS_TTF_DATA } from "@/lib/exporters/fonts-ttf-data";

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

export interface DocProject {
  title: string;
  passages: Passage[];
}

function buildOfficeFontFaces(th: OfficeTheme): string {
  return FONTS_TTF_DATA.filter((f) => th.fontFamilies.includes(f.family))
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-style: ${f.style}; font-weight: ${f.weight}; src: url("data:font/ttf;base64,${f.base64}") format('truetype'); }`
    )
    .join("\n    ");
}

export function buildDocHtml(project: DocProject, readingMode = false, theme: ThemeId = "clasico"): string {
  const passageNumbers = new Set(project.passages.map(p => p.number));
  const th = officeTheme(PDF_THEMES[theme] ?? PDF_THEMES.clasico);

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linkifyContent(content: string, passageNumber: number): string {
    const links = findPassageLinks(content, passageNumbers, passageNumber);
    let result = "";
    let lastIndex = 0;

    for (const link of links) {
      result += escapeHtml(content.slice(lastIndex, link.start));
      result += `<a href="#passage${link.target}" style="color:${th.linkInline};text-decoration:none;border-bottom:1px dotted ${th.linkDotted}">${escapeHtml(link.text)}</a><span style="color:#999;font-size:9pt"> [${link.target}]</span>`;
      lastIndex = link.end;
    }
    result += escapeHtml(content.slice(lastIndex));
    return result;
  }

  const fontFaces = th.id === "clasico" ? "" : `\n    ${buildOfficeFontFaces(th)}`;
  const headingRule = th.id === "clasico" ? "" : `\n    h1, .passage-number-center, .passage-number-left { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; }`;
  const upperRule = th.uppercaseHeadings ? `\n    h1, .passage-number-center, .passage-number-left { text-transform: uppercase; letter-spacing: 2px; }` : "";

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${escapeHtml(project.title)}</title>
  <style>${fontFaces}${headingRule}${upperRule}
    body {
      font-family: ${th.fontBody};
      font-size: 12pt;
      line-height: 1.5;
      color: ${th.text};
      margin: 2.54cm;
    }
    h1 {
      font-size: 24pt;
      color: ${th.accent};
      text-align: center;
      margin-bottom: 6pt;
      font-weight: bold;
    }
    .subtitle {
      font-size: 11pt;
      color: ${th.subtitle};
      font-style: italic;
      text-align: center;
      margin-bottom: 24pt;
    }
    .passage {
      margin-bottom: 18pt;
      page-break-inside: avoid;
    }
    .passage-number-center {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      color: ${th.accent};
      margin-bottom: 6pt;
    }
    .passage-number-left {
      font-size: 12pt;
      font-weight: bold;
      color: ${th.accent};
      margin-bottom: 6pt;
    }
    .passage-content {
      text-align: justify;
      margin-bottom: 12pt;
      white-space: pre-wrap;
    }
    .passage-links {
      margin-top: 12pt;
      padding: 8pt 12pt;
      background-color: ${th.linksBg};
      border: 1pt solid ${th.linksBorder};
    }
    .passage-links strong {
      color: ${th.accent};
    }
    .passage-links a {
      color: ${th.accent};
      text-decoration: none;
      font-weight: bold;
    }
    .start-marker {
      color: #22C55E;
      font-size: 10pt;
      font-weight: bold;
    }
    .end-marker {
      color: #EF4444;
      font-size: 10pt;
      font-weight: bold;
    }
    a { color: ${th.accent}; }
  </style>
</head>
<body>
  <h1>${escapeHtml(project.title)}</h1>
  <p class="subtitle">Librojuego generado por Secret Passage</p>
`;

  project.passages.forEach((passage) => {
    const markers = [];
    if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
    if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    const numClass = readingMode ? "passage-number-center" : "passage-number-left";

    html += `<div class="passage"><a name="passage${passage.number}" id="passage${passage.number}"></a>\n`;

    if (readingMode) {
      html += `  <div class="${numClass}">${passage.number}${markerStr}</div>\n`;
      html += `  <div class="passage-content">${linkifyContent(passage.content, passage.number)}</div>\n`;
    } else {
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${escapeHtml(passage.title)}`;
      html += `  <div class="${numClass}">${header}${markerStr}</div>\n`;
      html += `  <div class="passage-content">${linkifyContent(passage.content, passage.number)}</div>\n`;
      if (passage.outgoingLinks.length > 0) {
        html += `  <div class="passage-links"><strong>Opciones:</strong><br>\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          html += `    → <a href="#passage${link.target.number}">${escapeHtml(text)}</a><br>\n`;
        });
        html += `  </div>\n`;
      }
    }
    html += `</div>\n`;
  });

  html += `</body>\n</html>`;
  return html;
}

export async function generateDOC(projectId: string, readingMode = false, theme: ThemeId = "clasico"): Promise<string> {
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

  return buildDocHtml(
    { title: project.title, passages: project.passages },
    readingMode,
    theme
  );
}
