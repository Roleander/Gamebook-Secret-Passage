import { db } from "@/lib/db";

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

export async function generateDOC(projectId: string, readingMode = false): Promise<string> {
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

  const passageNumbers = new Set(project.passages.map(p => p.number));

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linkifyContent(content: string, passageNumber: number): string {
    const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (passageNumbers.has(num) && num !== passageNumber) {
        result += escapeHtml(content.slice(lastIndex, match.index));
        result += `<a href="#passage-${num}" style="color:#8B4513;text-decoration:none;border-bottom:1px dotted #C9A96E">${escapeHtml(match[0])}</a><span style="color:#999;font-size:9pt"> [${num}]</span>`;
        lastIndex = match.index + match[0].length;
      }
    }
    result += escapeHtml(content.slice(lastIndex));
    return result;
  }

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${escapeHtml(project.title)}</title>
  <style>
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1410;
      margin: 2.54cm;
    }
    h1 {
      font-size: 24pt;
      color: #8B4513;
      text-align: center;
      margin-bottom: 6pt;
      font-weight: bold;
    }
    .subtitle {
      font-size: 11pt;
      color: #666666;
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
      color: #8B4513;
      margin-bottom: 6pt;
    }
    .passage-number-left {
      font-size: 12pt;
      font-weight: bold;
      color: #8B4513;
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
      background-color: #F5F0E8;
      border: 1pt solid #E0D5C5;
    }
    .passage-links strong {
      color: #8B4513;
    }
    .passage-links a {
      color: #8B4513;
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
    a { color: #8B4513; }
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

    html += `<div class="passage"><a name="passage-${passage.number}" id="passage-${passage.number}"></a>\n`;

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
          html += `    → <a href="#passage-${link.target.number}">${escapeHtml(text)}</a><br>\n`;
        });
        html += `  </div>\n`;
      }
    }
    html += `</div>\n`;
  });

  html += `</body>\n</html>`;
  return html;
}
