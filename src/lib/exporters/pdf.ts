import { db } from "@/lib/db";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  outgoingLinks: {
    target: { number: number };
    linkText: string | null;
  }[];
}

export async function generatePDF(projectId: string): Promise<string> {
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

  return generateHTML(project);
}

function generateHTML(project: { title: string; passages: Passage[] }): string {
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
  });

  html += `
  </div>
</body>
</html>`;

  return html;
}

export async function generateEPUB(projectId: string): Promise<string> {
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

  // Build EPUB as a ZIP file with proper structure
  const epubParts: string[] = [];

  // mimetype (must be first, uncompressed)
  const mimetype = "application/epub+zip";

  // container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>Secret Passage</dc:creator>
    <dc:language>es</dc:language>
    <dc:identifier id="bookid">urn:uuid:${projectId}</dc:identifier>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${project.passages.map((_, i) => `<item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n    ")}
  </manifest>
  <spine>
    ${project.passages.map((_, i) => `<itemref idref="chapter${i + 1}"/>`).join("\n    ")}
  </spine>
</package>`;

  // nav.xhtml
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Índice</title></head>
<body>
  <nav epub:type="toc">
    <h1>Índice</h1>
    <ol>
      ${project.passages.map((p, i) => `<li><a href="chapter${i + 1}.xhtml">Pasaje ${p.number}${p.title ? ` — ${escapeXml(p.title)}` : ""}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`;

  // Chapter XHTML files
  const chapters = project.passages.map((passage, index) => {
    let linksHtml = "";
    if (passage.outgoingLinks.length > 0) {
      linksHtml = `<div class="links"><strong>Opciones:</strong><br/>`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        linksHtml += `→ <a href="chapter${passage.number}.xhtml">${escapeXml(text)}</a><br/>`;
      });
      linksHtml += `</div>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Pasaje ${passage.number}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.8; padding: 20px; }
    h2 { color: #8b4513; border-bottom: 2px solid #c9a96e; padding-bottom: 5px; }
    .content { text-align: justify; margin: 15px 0; white-space: pre-wrap; }
    .links { background: #f5f0e8; padding: 10px; border-left: 3px solid #c9a96e; margin-top: 15px; }
    a { color: #8b4513; }
  </style>
</head>
<body>
  <h2>Pasaje ${passage.number}${passage.title ? ` — ${escapeXml(passage.title)}` : ""}</h2>
  <div class="content">${escapeXml(passage.content)}</div>
  ${linksHtml}
</body>
</html>`;
  });

  // Create simple EPUB structure as JSON for download
  const epubData = {
    format: "epub",
    version: "3.0",
    metadata: {
      title: project.title,
      creator: "Secret Passage",
      language: "es",
      identifier: projectId,
    },
    chapters: project.passages.map((p, i) => ({
      number: p.number,
      title: p.title,
      content: p.content,
      links: p.outgoingLinks.map(l => ({
        text: l.linkText || `Continuar al pasaje ${l.target.number}`,
        target: l.target.number,
      })),
    })),
  };

  return JSON.stringify(epubData, null, 2);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
