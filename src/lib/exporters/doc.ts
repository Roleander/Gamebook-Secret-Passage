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
      border-bottom: 1px solid #e0d5c5;
      page-break-inside: avoid;
    }
    .passage:last-child { border-bottom: none; }
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
    .separator {
      text-align: center; color: #c9a96e; margin: 30px auto; width: 120px;
      border-top: 1px solid #c9a96e;
    }
    .inline-links { font-size: 10pt; color: #666; font-style: italic; margin-top: 10px; }
    .inline-links a { color: #8b4513; text-decoration: none; font-weight: bold; font-style: normal; }
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

  project.passages.forEach((passage, idx) => {
    if (readingMode) {
      if (idx > 0) {
        html += `    <div class="separator"></div>\n`;
      }
      html += `    <div class="passage" id="passage-${passage.number}">\n`;
      html += `      <div class="passage-content">${escapeHtml(passage.content)}</div>\n`;
      if (passage.outgoingLinks.length > 0) {
        html += `      <div class="inline-links">`;
        passage.outgoingLinks.forEach((link, linkIdx) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          if (linkIdx > 0) html += ` · `;
          html += `<a href="#passage-${link.target.number}">${escapeHtml(text)}</a>`;
        });
        html += `</div>\n`;
      }
      html += `    </div>\n\n`;
    } else {
      const markers = [];
      if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
      if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');

      html += `    <div class="passage" id="passage-${passage.number}">
      <div class="passage-header">
        Pasaje ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""} ${markers.join(" ")}
      </div>
      <div class="passage-content">${escapeHtml(passage.content)}</div>\n`;

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
