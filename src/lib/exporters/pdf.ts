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

export async function generatePDF(projectId: string): Promise<Buffer> {
  // Get project with passages
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      passages: {
        include: {
          outgoingLinks: {
            include: {
              target: {
                select: { number: true },
              },
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

  // Generate HTML content for PDF
  const htmlContent = generateHTML(project);

  // For now, return HTML as buffer
  // In production, use @react-pdf/renderer or puppeteer
  return Buffer.from(htmlContent, "utf-8");
}

function generateHTML(project: { title: string; passages: Passage[] }): string {
  let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${project.title}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1410;
      max-width: 100%;
    }
    .cover {
      text-align: center;
      padding: 100px 20px;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 36pt;
      color: #8b4513;
      margin-bottom: 20px;
    }
    .cover .subtitle {
      font-size: 14pt;
      color: #666;
    }
    .passage {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .passage-header {
      font-size: 14pt;
      font-weight: bold;
      color: #8b4513;
      border-bottom: 2px solid #c9a96e;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    .passage-content {
      text-align: justify;
    }
    .passage-links {
      margin-top: 15px;
      padding: 10px;
      background: #f5f0e8;
      border-left: 3px solid #c9a96e;
    }
    .passage-links a {
      color: #8b4513;
      text-decoration: none;
    }
    .passage-links a:hover {
      text-decoration: underline;
    }
    .start-marker {
      color: #22c55e;
      font-size: 10pt;
    }
    .end-marker {
      color: #ef4444;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${project.title}</h1>
    <p class="subtitle">Librojuego generado por Secret Passage</p>
  </div>
`;

  project.passages.forEach((passage) => {
    html += `
  <div class="passage" id="passage-${passage.number}">
    <div class="passage-header">
      Pasaje ${passage.number}
      ${passage.title ? ` - ${passage.title}` : ""}
      ${passage.number === 1 ? ' <span class="start-marker">[INICIO]</span>' : ""}
    </div>
    <div class="passage-content">
      ${formatContent(passage.content)}
    </div>
`;

    if (passage.outgoingLinks.length > 0) {
      html += `
    <div class="passage-links">
      <strong>Opciones:</strong><br>
`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        html += `      <a href="#passage-${link.target.number}">${text}</a><br>`;
      });
      html += `    </div>`;
    }

    html += `
  </div>
`;
  });

  html += `
</body>
</html>
`;

  return html;
}

function formatContent(content: string): string {
  // Convert plain text to HTML paragraphs
  return content
    .split("\n\n")
    .map((paragraph) => `<p>${paragraph.trim()}</p>`)
    .join("\n");
}

export async function generateEPUB(projectId: string): Promise<Buffer> {
  // Get project with passages
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      passages: {
        include: {
          outgoingLinks: {
            include: {
              target: {
                select: { number: true },
              },
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

  // Generate EPUB content
  const epubContent = generateEPUBContent(project);

  return Buffer.from(JSON.stringify(epubContent), "utf-8");
}

function generateEPUBContent(project: { title: string; passages: Passage[] }) {
  // This is a simplified EPUB structure
  // In production, use epub-gen library
  return {
    title: project.title,
    author: "Secret Passage",
    chapters: project.passages.map((passage) => ({
      title: `Pasaje ${passage.number}${passage.title ? ` - ${passage.title}` : ""}`,
      content: formatContent(passage.content),
      links: passage.outgoingLinks.map((link) => ({
        text: link.linkText || `Continuar al pasaje ${link.target.number}`,
        passageNumber: link.target.number,
      })),
    })),
  };
}
