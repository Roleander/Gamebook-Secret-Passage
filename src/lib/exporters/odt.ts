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
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>`);

  // meta.xml
  zip.file("meta.xml", `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta"
  office:version="1.2">
  <office:meta>
    <meta:generator>Secret Passage</meta:generator>
  </office:meta>
</office:document-meta>`);

  // styles.xml
  zip.file("styles.xml", `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible"
  office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm" style:line-spacing="115%"/>
      <style:text-properties style:font-name="Times New Roman" fo:font-size="12pt"/>
    </style:default-style>
    <style:style style:name="Heading1" style:family="paragraph" style:parent-style-name="Heading_1">
      <style:text-properties fo:font-size="24pt" fo:font-weight="bold" fo:color="#8B4513"/>
    </style:style>
    <style:style style:name="Heading2" style:family="paragraph" style:parent-style-name="Heading_2">
      <style:text-properties fo:font-size="14pt" fo:font-style="italic" fo:color="#666666"/>
    </style:style>
    <style:style style:name="PassageTitle" style:family="paragraph">
      <style:text-properties fo:font-size="14pt" fo:font-weight="bold" fo:color="#8B4513"/>
    </style:style>
    <style:style style:name="PassageContent" style:family="paragraph">
      <style:text-properties fo:font-size="12pt"/>
    </style:style>
  </office:styles>
</office:document-styles>`);

  // content.xml
  let content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible"
  office:version="1.2">
  <office:body>
    <office:text>
      <text:p text:style-name="Heading1">${escapeXml(project.title)}</text:p>
      <text:p text:style-name="Heading2">Librojuego generado por Secret Passage</text:p>
      <text:p text:style-name="PassageContent"/>
`;

  project.passages.forEach((passage) => {
    // Passage title
    content += `      <text:p text:style-name="PassageTitle">--- PASAJE ${passage.number}`;
    if (passage.title) content += ` — ${escapeXml(passage.title)}`;
    if (passage.number === 1) content += " [INICIO]";
    if (passage.isEndpoint) content += " [FIN]";
    content += ` ---</text:p>\n`;

    // Content paragraphs
    const lines = passage.content.split("\n");
    lines.forEach((line) => {
      content += `      <text:p text:style-name="PassageContent">${escapeXml(line)}</text:p>\n`;
    });

    // Links
    if (passage.outgoingLinks.length > 0) {
      content += `      <text:p text:style-name="PassageTitle">Opciones:</text:p>\n`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        content += `      <text:p text:style-name="PassageContent">  → ${escapeXml(text)}</text:p>\n`;
      });
    }

    content += `      <text:p text:style-name="PassageContent"/>\n`;
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
