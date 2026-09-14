const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  // Get first project with passages
  const project = await prisma.project.findFirst({
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
    console.log("No hay proyectos en la base de datos");
    return;
  }

  console.log(`Proyecto: ${project.title}`);
  console.log(`Pasajes: ${project.passages.length}`);

  // Generate HTML (PDF-like)
  const html = generateHTML(project);
  const outputDir = path.join(__dirname, "..", "exports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlPath = path.join(outputDir, `${project.title}.html`);
  fs.writeFileSync(htmlPath, html, "utf-8");
  console.log(`HTML generado: ${htmlPath}`);

  // Generate EPUB
  const epubData = generateEPUBData(project);
  const epubPath = path.join(outputDir, `${project.title}.epub.json`);
  fs.writeFileSync(epubPath, JSON.stringify(epubData, null, 2), "utf-8");
  console.log(`EPUB data generado: ${epubPath}`);

  await prisma.$disconnect();
}

function generateHTML(project) {
  const escapeHtml = (text) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title)}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1410;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .container { max-width: 210mm; margin: 0 auto; padding: 20mm; }
    .cover {
      text-align: center;
      padding: 100px 20px;
      page-break-after: always;
      border-bottom: 3px double #8b4513;
      margin-bottom: 40px;
    }
    .cover h1 {
      font-size: 36pt;
      color: #8b4513;
      margin-bottom: 20px;
      letter-spacing: 3px;
    }
    .cover .subtitle { font-size: 14pt; color: #666; font-style: italic; }
    .cover .year { font-size: 12pt; color: #999; margin-top: 30px; }
    .passage {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e0d5c5;
      page-break-inside: avoid;
    }
    .passage:last-child { border-bottom: none; }
    .passage-header {
      font-size: 14pt;
      font-weight: bold;
      color: #8b4513;
      margin-bottom: 10px;
      padding: 8px 12px;
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
      padding: 12px 15px;
      background: #faf8f5;
      border: 1px solid #e0d5c5;
      border-radius: 4px;
    }
    .passage-links strong { color: #8b4513; display: block; margin-bottom: 8px; }
    .passage-links a {
      color: #8b4513;
      text-decoration: none;
      font-weight: bold;
      display: block;
      margin: 4px 0;
    }
    .start-marker { color: #22c55e; font-size: 10pt; font-weight: bold; }
    .end-marker { color: #ef4444; font-size: 10pt; font-weight: bold; }
    @media print {
      .container { padding: 0; }
      .passage { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="cover">
      <h1>${escapeHtml(project.title)}</h1>
      <p class="subtitle">${escapeHtml(project.description || "Librojuego")}</p>
      <p class="year">Generado por Secret Passage • ${new Date().getFullYear()}</p>
    </div>
`;

  project.passages.forEach((passage) => {
    html += `
    <div class="passage" id="passage-${passage.number}">
      <div class="passage-header">
        PASAJE ${passage.number}${passage.title ? ` — ${escapeHtml(passage.title)}` : ""}
        ${passage.number === 1 ? ' <span class="start-marker">[INICIO]</span>' : ""}
        ${passage.isEndpoint ? ' <span class="end-marker">[FIN]</span>' : ""}
      </div>
      <div class="passage-content">${escapeHtml(passage.content)}</div>
`;

    if (passage.outgoingLinks.length > 0) {
      html += `
      <div class="passage-links">
        <strong>Opciones:</strong>
`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        html += `        <a href="#passage-${link.target.number}">→ ${escapeHtml(text)}</a>\n`;
      });
      html += `      </div>\n`;
    }

    html += `    </div>\n`;
  });

  html += `
  </div>
</body>
</html>`;

  return html;
}

function generateEPUBData(project) {
  return {
    format: "epub",
    version: "3.0",
    metadata: {
      title: project.title,
      creator: "Secret Passage",
      language: "es",
      identifier: project.id,
      date: new Date().toISOString().split("T")[0],
    },
    chapters: project.passages.map((passage) => ({
      number: passage.number,
      title: passage.title || `Pasaje ${passage.number}`,
      content: passage.content,
      isStart: passage.number === 1,
      isEndpoint: passage.isEndpoint,
      links: passage.outgoingLinks.map((link) => ({
        text: link.linkText || `Continuar al pasaje ${link.target.number}`,
        target: link.target.number,
      })),
    })),
  };
}

main().catch(console.error);
