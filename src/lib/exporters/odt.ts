import { db } from "@/lib/db";
import JSZip from "jszip";

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

export async function generateODT(projectId: string, readingMode = false): Promise<Buffer> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      passages: {
        include: {
          outgoingLinks: {
            include: { target: { select: { number: true } } },
          },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!project) throw new Error("Proyecto no encontrado");

  const zip = new JSZip();

  // mimetype MUST be first and uncompressed
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" as any });

  zip.file("META-INF/manifest.xml", `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>`);

  zip.file("meta.xml", `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta"
  office:version="1.2">
  <office:meta>
    <meta:generator>Secret Passage</meta:generator>
  </office:meta>
</office:document-meta>`);

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
    <style:style style:name="PassageNumberCenter" style:family="paragraph">
      <style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#8B4513"/>
      <style:paragraph-properties fo:text-align="center"/>
    </style:style>
    <style:style style:name="PassageNumber" style:family="paragraph">
      <style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#8B4513"/>
    </style:style>
    <style:style style:name="PassageContent" style:family="paragraph">
      <style:text-properties fo:font-size="12pt"/>
    </style:style>
    <style:style style:name="Hyperlink" style:family="text">
      <style:text-properties fo:color="#8B4513" style:text-underline-style="solid"/>
    </style:style>
  </office:styles>
</office:document-styles>`);

  const passageNumbers = new Set(project.passages.map(p => p.number));

  function escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function convertInlineLinks(line: string): string {
    const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
    let result = "";
    let lastIdx = 0;
    let m;

    while ((m = regex.exec(line)) !== null) {
      const numStr = m[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (passageNumbers.has(num)) {
        result += escapeXml(line.slice(lastIdx, m.index));
        result += `<text:a xlink:href="#passage${num}" text:style-name="Hyperlink">${escapeXml(m[0])}</text:a>`;
        lastIdx = m.index + m[0].length;
      }
    }
    result += escapeXml(line.slice(lastIdx));
    return result;
  }

  let content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text"
  xmlns:xlink="http://www.w3.org/1999/xlink"
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
    content += `      <text:bookmark text:name="passage${passage.number}"/>\n`;

    const markers = [];
    if (passage.number === 1) markers.push("[INICIO]");
    if (passage.isEndpoint) markers.push("[FIN]");
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    if (readingMode) {
      content += `      <text:p text:style-name="PassageNumberCenter">${passage.number}${markerStr}</text:p>\n`;
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        content += `      <text:p text:style-name="PassageContent">${convertInlineLinks(line)}</text:p>\n`;
      });
    } else {
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${escapeXml(passage.title)}`;
      content += `      <text:p text:style-name="PassageNumber">${header}${markerStr}</text:p>\n`;
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        content += `      <text:p text:style-name="PassageContent">${convertInlineLinks(line)}</text:p>\n`;
      });
      if (passage.outgoingLinks.length > 0) {
        content += `      <text:p text:style-name="PassageNumber">Opciones:</text:p>\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          content += `      <text:p text:style-name="PassageContent">  → `;
          content += `<text:a xlink:href="#passage${link.target.number}" text:style-name="Hyperlink">${escapeXml(text)}</text:a></text:p>\n`;
        });
      }
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
