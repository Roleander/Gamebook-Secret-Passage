import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { generatePDF } from "@/lib/exporters/pdf";
import JSZip from "jszip";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { projectId, format } = await req.json();

    if (!projectId || !format) {
      return NextResponse.json(
        { error: "projectId y format son requeridos" },
        { status: 400 }
      );
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
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
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const safeTitle = project.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "").trim();

    switch (format) {
      case "pdf": {
        const html = await generatePDF(projectId);
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeTitle}.html"`,
          },
        });
      }
      case "epub": {
        const epubBuffer = await generateEPUB(project);
        return new NextResponse(new Uint8Array(epubBuffer), {
          headers: {
            "Content-Type": "application/epub+zip",
            "Content-Disposition": `attachment; filename="${safeTitle}.epub"`,
          },
        });
      }
      default:
        return NextResponse.json(
          { error: "Formato no soportado. Usa 'pdf' o 'epub'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { error: "Error al exportar el proyecto" },
      { status: 500 }
    );
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateEPUB(project: any): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" as any });

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
    ${project.passages.map((_: any, i: number) => `<item id="chapter${i + 1}" href="chapter${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n    ")}
  </manifest>
  <spine>
    ${project.passages.map((_: any, i: number) => `<itemref idref="chapter${i + 1}"/>`).join("\n    ")}
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
      ${project.passages.map((p: any, i: number) => `<li><a href="chapter${i + 1}.xhtml">Pasaje ${p.number}${p.title ? ` — ${escapeXml(p.title)}` : ""}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`;
  zip.file("OEBPS/nav.xhtml", navXhtml);

  // Chapter XHTML files
  project.passages.forEach((passage: any, index: number) => {
    let linksHtml = "";
    if (passage.outgoingLinks.length > 0) {
      linksHtml = `<div class="links"><strong>Opciones:</strong>\n`;
      passage.outgoingLinks.forEach((link: any) => {
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

  const content = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(content);
}
