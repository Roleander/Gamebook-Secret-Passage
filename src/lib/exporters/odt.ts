import { db } from "@/lib/db";
import { ZipArchive } from "archiver";
import { Writable } from "stream";

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

  // Build content.xml
  let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible"
  office:version="1.2">
  <office:body>
    <office:text>
`;

  contentXml += `      <text:p text:style-name="Heading1">${escapeXml(project.title)}</text:p>\n`;
  contentXml += `      <text:p text:style-name="Heading2">Librojuego generado por Secret Passage</text:p>\n`;
  contentXml += `      <text:p text:style-name="Standard"/>\n`;

  project.passages.forEach((passage) => {
    contentXml += `      <text:bookmark text:name="passage${passage.number}"/>`;

    const markers = [];
    if (passage.number === 1) markers.push("[INICIO]");
    if (passage.isEndpoint) markers.push("[FIN]");
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    if (readingMode) {
      contentXml += `<text:p text:style-name="PassageNumberCenter">${passage.number}${markerStr}</text:p>\n`;
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        contentXml += `      <text:p text:style-name="Standard">${convertInlineLinks(line)}</text:p>\n`;
      });
    } else {
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${escapeXml(passage.title)}`;
      contentXml += `<text:p text:style-name="PassageNumber">${header}${markerStr}</text:p>\n`;
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        contentXml += `      <text:p text:style-name="Standard">${convertInlineLinks(line)}</text:p>\n`;
      });
      if (passage.outgoingLinks.length > 0) {
        contentXml += `      <text:p text:style-name="PassageNumber">Opciones:</text:p>\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          contentXml += `      <text:p text:style-name="Standard">  → `;
          contentXml += `<text:a xlink:href="#passage${link.target.number}" text:style-name="Hyperlink">${escapeXml(text)}</text:a></text:p>\n`;
        });
      }
    }
    contentXml += `      <text:p text:style-name="Standard"/>\n`;
  });

  contentXml += `    </office:text>
  </office:body>
</office:document-content>`;

  // Build styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible"
  office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm" style:line-spacing="115%"/>
      <style:text-properties style:font-name="Times New Roman" fo:font-size="12pt"/>
    </style:default-style>
    <style:style style:name="Heading1" style:family="paragraph" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm"/>
      <style:text-properties fo:font-size="24pt" fo:font-weight="bold" fo:color="#8B4513" style:font-name="Times New Roman"/>
    </style:style>
    <style:style style:name="Heading2" style:family="paragraph" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm"/>
      <style:text-properties fo:font-size="14pt" fo:font-style="italic" fo:color="#666666" style:font-name="Times New Roman"/>
    </style:style>
    <style:style style:name="PassageNumberCenter" style:family="paragraph" style:next-style-name="Standard">
      <style:paragraph-properties fo:text-align="center"/>
      <style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#8B4513" style:font-name="Times New Roman"/>
    </style:style>
    <style:style style:name="PassageNumber" style:family="paragraph" style:next-style-name="Standard">
      <style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#8B4513" style:font-name="Times New Roman"/>
    </style:style>
    <style:style style:name="Standard" style:family="paragraph" style:class="text">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.49cm" style:line-spacing="115%"/>
      <style:text-properties style:font-name="Times New Roman" fo:font-size="12pt"/>
    </style:style>
    <style:style style:name="Hyperlink" style:family="text">
      <style:text-properties fo:color="#8B4513" style:text-underline-style="solid"/>
    </style:style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="pm1">
      <style:page-layout-properties fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2cm" fo:margin-right="2cm"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1"/>
  </office:master-styles>
</office:document-styles>`;

  // Build meta.xml
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta"
  office:version="1.2">
  <office:meta>
    <meta:generator>Secret Passage</meta:generator>
  </office:meta>
</office:document-meta>`;

  // Build META-INF/manifest.xml
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
</manifest:manifest>`;

  // Use archiver to guarantee file order (mimetype MUST be first for ODF)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = new (ZipArchive as any)("zip", { zlib: { level: 9 } });

    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    const writable = new Writable({
      write(chunk: Buffer, _encoding: BufferEncoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    archive.pipe(writable);

    // 1. mimetype FIRST, STORED (no compression), no extra field
    archive.append("application/vnd.oasis.opendocument.text", {
      name: "mimetype",
      store: true,
    });

    // 2. content.xml
    archive.append(contentXml, { name: "content.xml" });

    // 3. styles.xml
    archive.append(stylesXml, { name: "styles.xml" });

    // 4. meta.xml
    archive.append(metaXml, { name: "meta.xml" });

    // 5. META-INF/manifest.xml
    archive.append(manifestXml, { name: "META-INF/manifest.xml" });

    archive.finalize();
  });
}
