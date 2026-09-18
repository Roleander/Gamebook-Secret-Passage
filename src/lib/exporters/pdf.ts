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

export async function generatePDF(projectId: string, readingMode = false): Promise<string> {
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

  return generateHTML(project, readingMode);
}

function buildLinkMap(passages: Passage[]): Map<number, { targetNumber: number; text: string }[]> {
  const map = new Map<number, { targetNumber: number; text: string }[]>();
  for (const p of passages) {
    if (p.outgoingLinks.length > 0) {
      map.set(p.number, p.outgoingLinks.map(l => ({
        targetNumber: l.target.number,
        text: l.linkText || `Pasaje ${l.target.number}`,
      })));
    }
  }
  return map;
}

function linkifyContent(content: string, passageNumber: number, linkMap: Map<number, { targetNumber: number; text: string }[]>, escapeHtml: (t: string) => string): string {
  const links = linkMap.get(passageNumber);
  if (!links || links.length === 0) return escapeHtml(content);

  const passageNumbers = new Set(linkMap.keys());
  const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const numStr = match[1].replace(",", ".");
    const num = parseFloat(numStr);
    if (passageNumbers.has(num) && num !== passageNumber) {
      result += escapeHtml(content.slice(lastIndex, match.index));
      result += `<a href="#passage-${num}" style="color:#8b4513;text-decoration:none;border-bottom:1px solid #c9a96e;font-weight:bold">${escapeHtml(match[0])}</a>`;
      lastIndex = match.index + match[0].length;
    }
  }
  result += escapeHtml(content.slice(lastIndex));
  return result;
}

function generateHTML(project: { title: string; passages: Passage[] }, readingMode: boolean): string {
  const escapeHtml = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const linkMap = buildLinkMap(project.passages);

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.8;
      color: #1a1410;
      background: #f5f0e8;
      padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
    .cover {
      text-align: center;
      padding: 80px 20px;
      border-bottom: 3px double #8b4513;
      margin-bottom: 40px;
    }
    .cover h1 { font-size: 32px; color: #8b4513; margin-bottom: 10px; letter-spacing: 2px; }
    .cover .subtitle { font-size: 14px; color: #666; font-style: italic; }
    .passage {
      margin-bottom: 30px;
      padding-bottom: 20px;
      page-break-inside: avoid;
    }
    .passage-number {
      font-size: 13px;
      font-weight: bold;
      color: #8b4513;
      margin-bottom: 6px;
    }
    .passage-header {
      font-size: 16px;
      font-weight: bold;
      color: #8b4513;
      margin-bottom: 10px;
      padding: 5px 10px;
      background: #f5f0e8;
      border-left: 4px solid #c9a96e;
    }
    .passage-content {
      text-align: justify;
      margin-bottom: 15px;
      white-space: pre-wrap;
    }
    .passage-links {
      margin-top: 15px;
      padding: 10px 15px;
      background: #faf8f5;
      border: 1px solid #e0d5c5;
      border-radius: 4px;
    }
    .passage-links strong { color: #8b4513; }
    .passage-links a { color: #8b4513; text-decoration: none; font-weight: bold; }
    .start-marker { color: #22c55e; font-size: 11px; font-weight: bold; }
    .end-marker { color: #ef4444; font-size: 11px; font-weight: bold; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 0; }
      .passage { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <h1>${escapeHtml(project.title)}</h1>
      <p class="subtitle">Librojuego generado por Secret Passage</p>
    </div>
`;

  project.passages.forEach((passage) => {
    if (readingMode) {
      const markers = [];
      if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
      if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');

      html += `    <div class="passage" id="passage-${passage.number}">\n`;
      html += `      <div class="passage-number">Pasaje ${passage.number} ${markers.join(" ")}</div>\n`;
      html += `      <div class="passage-content">${linkifyContent(passage.content, passage.number, linkMap, escapeHtml)}</div>\n`;
      html += `    </div>\n`;
    } else {
      html += `
    <div class="passage" id="passage-${passage.number}">
      <div class="passage-number">Pasaje ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""}</div>
      <div class="passage-content">${linkifyContent(passage.content, passage.number, linkMap, escapeHtml)}</div>
`;
      if (passage.outgoingLinks.length > 0) {
        html += `
      <div class="passage-links">
        <strong>Opciones:</strong><br>
`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          html += `        → <a href="#passage-${link.target.number}">${escapeHtml(text)}</a><br>\n`;
        });
        html += `      </div>\n`;
      }
      html += `    </div>\n`;
    }
  });

  html += `
  </div>
</body>
</html>`;

  return html;
}
