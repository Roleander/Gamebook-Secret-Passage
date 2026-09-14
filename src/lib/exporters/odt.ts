import { db } from "@/lib/db";
import JSZip from "jszip";

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

export async function generateODT(projectId: string): Promise<Buffer> {
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

  const zip = new JSZip();

  // mimetype (must be first, uncompressed)
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" as any });

  // META-INF/manifest.xml
  zip.file("META-INF/manifest.xml", `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="urn:oasis:names:tc:opendocument:xmlns:manifest" version="1.2">
  <file-entry media-type="text/xml" full-path="content.xml"/>
  <file-entry media-type="text/xml" full-path="styles.xml"/>
</manifest>`);

  // styles.xml
  zip.file("styles.xml", `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style"
  office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Heading1" style:family="paragraph" style:parent-style-name="Heading_1"/>
    <style:style style:name="Heading2" style:family="paragraph" style:parent-style-name="Heading_2"/>
    <style:style style:name="PassageTitle" style:family="paragraph" style:parent-style-name="Heading_3">
      <style:text-properties fo:color="#8B4513" style:font-weight="bold"/>
    </style:style>
  </office:automatic-styles>
</office:document-content>`);

  // content.xml
  let content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style"
  office:version="1.2">
  <office:body>
    <office:text>
      <text:p text:style-name="Heading1">${escapeXml(project.title)}</text:p>
      <text:p text:style-name="Heading2">Librojuego generado por Secret Passage</text:p>
      <text:line-break/>
`;

  project.passages.forEach((passage) => {
    content += `      <text:p text:style-name="PassageTitle">--- PASAJE ${passage.number}`;
    if (passage.title) content += ` — ${escapeXml(passage.title)}`;
    if (passage.number === 1) content += " [INICIO]";
    if (passage.isEndpoint) content += " [FIN]";
    content += ` ---</text:p>\n`;

    // Split content by lines and add each as a paragraph
    const lines = passage.content.split("\n");
    lines.forEach((line) => {
      content += `      <text:p>${escapeXml(line)}</text:p>\n`;
    });

    if (passage.outgoingLinks.length > 0) {
      content += `      <text:p text:style-name="PassageTitle">Opciones:</text:p>\n`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        content += `      <text:p>  → ${escapeXml(text)}</text:p>\n`;
      });
    }

    content += `      <text:line-break/>\n`;
  });

  content += `    </office:text>
  </office:body>
</office:document-content>`;

  zip.file("content.xml", content);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(buffer);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
