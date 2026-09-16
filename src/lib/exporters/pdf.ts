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

function generateHTML(project: { title: string; passages: Passage[] }, readingMode: boolean): string {
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
    .cover h1 {
      font-size: 32px;
      color: #8b4513;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }
    .cover .subtitle { font-size: 14px; color: #666; font-style: italic; }
    .passage {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e0d5c5;
      page-break-inside: avoid;
    }
    .passage:last-child { border-bottom: none; }
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
    .passage-links a {
      color: #8b4513;
      text-decoration: none;
      font-weight: bold;
    }
    .passage-links a:hover { text-decoration: underline; }
    .start-marker { color: #22c55e; font-size: 11px; font-weight: bold; }
    .end-marker { color: #ef4444; font-size: 11px; font-weight: bold; }
    .separator { text-align: center; color: #c9a96e; margin: 25px 0; font-size: 18px; letter-spacing: 8px; }
    .inline-links { font-size: 13px; color: #666; font-style: italic; margin-top: 10px; }
    .inline-links a { color: #8b4513; text-decoration: none; font-weight: bold; font-style: normal; }
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

  project.passages.forEach((passage, idx) => {
    if (readingMode) {
      // Reading mode: integrated, no headers
      if (idx > 0) {
        html += `    <div class="separator">* * *</div>\n`;
      }
      html += `    <div class="passage" id="passage-${passage.number}">\n`;
      html += `      <div class="passage-content">${escapeHtml(passage.content)}</div>\n`;

      // Inline links at the end, integrated
      if (passage.outgoingLinks.length > 0) {
        html += `      <div class="inline-links">`;
        passage.outgoingLinks.forEach((link, linkIdx) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          if (linkIdx > 0) html += ` · `;
          html += `<a href="#passage-${link.target.number}">${escapeHtml(text)}</a>`;
        });
        html += `</div>\n`;
      }

      html += `    </div>\n`;
    } else {
      // Structured mode: original with headers
      html += `
    <div class="passage" id="passage-${passage.number}">
      <div class="passage-header">
        Pasaje ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""}
        ${passage.number === 1 ? ' <span class="start-marker">[INICIO]</span>' : ""}
      </div>
      <div class="passage-content">${escapeHtml(passage.content)}</div>
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
