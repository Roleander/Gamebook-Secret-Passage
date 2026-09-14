const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const prisma = new PrismaClient();

async function main() {
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

  console.log(`Generando EPUB para: ${project.title}`);
  console.log(`Pasajes: ${project.passages.length}`);

  const outputDir = path.join(__dirname, "..", "exports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const epubPath = path.join(outputDir, `${project.title}.epub`);
  await generateEPUB(project, epubPath);
  console.log(`EPUB generado: ${epubPath}`);

  // Also generate HTML
  const htmlPath = path.join(outputDir, `${project.title}.html`);
  const html = generateHTML(project);
  fs.writeFileSync(htmlPath, html, "utf-8");
  console.log(`HTML generado: ${htmlPath}`);

  await prisma.$disconnect();
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function generateEPUB(project, outputPath) {
  const zip = new JSZip();

  // mimetype (must be first, uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // container.xml
  zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>Secret Passage</dc:creator>
    <dc:language>es</dc:language>
    <dc:identifier id="bookid">urn:uuid:${project.id}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
    ${project.passages.map((_, i) => `<item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n    ")}
  </manifest>
  <spine>
    ${project.passages.map((_, i) => `<itemref idref="chapter${i + 1}"/>`).join("\n    ")}
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", contentOpf);

  // style.css
  zip.file("OEBPS/style.css", `body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.8;
  padding: 20px;
  color: #1a1410;
}
h2 {
  color: #8b4513;
  border-bottom: 2px solid #c9a96e;
  padding-bottom: 5px;
  margin-bottom: 15px;
}
.content {
  text-align: justify;
  margin: 15px 0;
  white-space: pre-wrap;
}
.links {
  background: #f5f0e8;
  padding: 10px 15px;
  border-left: 3px solid #c9a96e;
  margin-top: 15px;
}
.links strong { color: #8b4513; display: block; margin-bottom: 8px; }
a { color: #8b4513; text-decoration: none; }
a:hover { text-decoration: underline; }
.start-marker { color: #22c55e; font-size: 0.9em; }
.end-marker { color: #ef4444; font-size: 0.9em; }`);

  // nav.xhtml
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Índice</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc">
    <h1>Índice</h1>
    <ol>
      ${project.passages.map((p, i) => `<li><a href="chapter${i + 1}.xhtml">Pasaje ${p.number}${p.title ? ` — ${escapeXml(p.title)}` : ""}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`;
  zip.file("OEBPS/nav.xhtml", navXhtml);

  // Chapter XHTML files
  project.passages.forEach((passage, index) => {
    let linksHtml = "";
    if (passage.outgoingLinks.length > 0) {
      linksHtml = `<div class="links"><strong>Opciones:</strong>\n`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        linksHtml += `<p>→ <a href="chapter${link.target.number}.xhtml">${escapeXml(text)}</a></p>\n`;
      });
      linksHtml += `</div>`;
    }

    const markers = [];
    if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
    if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');

    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Pasaje ${passage.number}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h2>Pasaje ${passage.number}${passage.title ? ` — ${escapeXml(passage.title)}` : ""} ${markers.join(" ")}</h2>
  <div class="content">${escapeXml(passage.content)}</div>
  ${linksHtml}
</body>
</html>`;

    zip.file(`OEBPS/chapter${index + 1}.xhtml`, chapterXhtml);
  });

  // Generate the EPUB file
  const content = await zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip" });
  fs.writeFileSync(outputPath, content);
}

function generateHTML(project) {
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

main().catch(console.error);
