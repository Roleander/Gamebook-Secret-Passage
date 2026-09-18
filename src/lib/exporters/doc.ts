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
            include: {
              target: { select: { number: true } },
            },
          },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!project) {
    throw new Error("Proyecto no encontrado");
  }

  const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const passageNumbers = new Set(project.passages.map(p => p.number));

  function linkifyContent(content: string): string {
    const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (passageNumbers.has(num)) {
        result += escapeHtml(content.slice(lastIndex, match.index));
        result += `<a href="#passage-${num}" style="color:#8b4513;text-decoration:none;border-bottom:1px solid #c9a96e;font-weight:bold">${escapeHtml(match[0])}</a>`;
        lastIndex = match.index + match[0].length;
      }
    }
    result += escapeHtml(content.slice(lastIndex));
    return result;
  }

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 40px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .cover {
      text-align: center;
      padding: 60px 20px;
      border-bottom: 3px double #8b4513;
      margin-bottom: 40px;
      page-break-after: always;
    }
    .cover h1 { font-size: 28pt; color: #8b4513; margin-bottom: 10px; }
    .cover .subtitle { font-size: 12pt; color: #666; font-style: italic; }
    .toc { margin-bottom: 40px; page-break-after: always; }
    .toc h2 {
      font-size: 18pt; color: #8b4513;
      border-bottom: 2px solid #c9a96e; padding-bottom: 5px; margin-bottom: 15px;
    }
    .toc ul { list-style: none; padding: 0; }
    .toc li { margin-bottom: 8px; }
    .toc a { color: #8b4513; text-decoration: none; }
    .passage {
      margin-bottom: 30px; padding-bottom: 20px;
      page-break-inside: avoid;
    }
    .passage-number {
      font-size: 13pt; font-weight: bold; color: #8b4513;
      margin-bottom: 8px;
    }
    .passage-header {
      font-size: 14pt; font-weight: bold; color: #8b4513;
      margin-bottom: 10px; padding: 5px 10px;
      background: #f5f0e8; border-left: 4px solid #c9a96e;
    }
    .passage-content { text-align: justify; margin-bottom: 15px; white-space: pre-wrap; }
    .passage-links {
      margin-top: 15px; padding: 10px 15px;
      background: #faf8f5; border: 1px solid #e0d5c5; border-radius: 4px;
    }
    .passage-links strong { color: #8b4513; display: block; margin-bottom: 8px; }
    .passage-links a { color: #8b4513; text-decoration: none; font-weight: bold; }
    .start-marker { color: #22c55e; font-size: 10pt; font-weight: bold; }
    .end-marker { color: #ef4444; font-size: 10pt; font-weight: bold; }
    @media print { body { padding: 0; } .passage { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <h1>${escapeHtml(project.title)}</h1>
      <p class="subtitle">Librojuego generado por Secret Passage</p>
    </div>
`;

  if (!readingMode) {
    html += `    <div class="toc">
      <h2>Índice</h2>
      <ul>\n`;
    project.passages.forEach((passage) => {
      html += `        <li><a href="#passage-${passage.number}">Pasaje ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""}</a></li>\n`;
    });
    html += `      </ul>\n    </div>\n\n`;
  }

  project.passages.forEach((passage) => {
    const markers = [];
    if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
    if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');

    if (readingMode) {
      html += `    <div class="passage" id="passage-${passage.number}">\n`;
      html += `      <div class="passage-number">Pasaje ${passage.number} ${markers.join(" ")}</div>\n`;
      html += `      <div class="passage-content">${linkifyContent(passage.content)}</div>\n`;
      html += `    </div>\n\n`;
    } else {
      html += `    <div class="passage" id="passage-${passage.number}">\n`;
      html += `      <div class="passage-number">Pasaje ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""} ${markers.join(" ")}</div>\n`;
      html += `      <div class="passage-content">${linkifyContent(passage.content)}</div>\n`;
      if (passage.outgoingLinks.length > 0) {
        html += `      <div class="passage-links">
        <strong>Opciones:</strong>\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          html += `        → <a href="#passage-${link.target.number}">${escapeHtml(text)}</a><br>\n`;
        });
        html += `      </div>\n`;
      }
      html += `    </div>\n\n`;
    }
  });

  html += `  </div>
</body>
</html>`;

  return html;
}
