import { db } from "@/lib/db";
import { findPassageLinks } from "@/lib/reference-links";
import { ZipArchive } from "archiver";
import { Writable } from "stream";
import { PDF_THEMES, officeTheme, type OfficeTheme, type ThemeId } from "@/lib/exporters/themes";
import { FONTS_TTF_DATA } from "@/lib/exporters/fonts-ttf-data";

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

export interface OdtData {
  title: string;
  passages: Passage[];
}

function escapeXml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildContentXml(project: OdtData, readingMode: boolean, theme: ThemeId = "clasico"): string {
  const passageNumbers = new Set(project.passages.map((p) => p.number));

  function convertInlineLinks(line: string): string {
    const links = findPassageLinks(line, passageNumbers);
    let result = "";
    let lastIdx = 0;

    for (const link of links) {
      result += escapeXml(line.slice(lastIdx, link.start));
      result += `<text:a xlink:type="simple" xlink:href="#passage${link.target}" text:style-name="Hyperlink">${escapeXml(link.text)}</text:a>`;
      lastIdx = link.end;
    }
    result += escapeXml(line.slice(lastIdx));
    return result;
  }

  let contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:body>
    <office:text>
`;

  contentXml += `      <text:p text:style-name="Heading1">${escapeXml(project.title)}</text:p>\n`;
  contentXml += `      <text:p text:style-name="Heading2">Librojuego generado por Secret Passage</text:p>\n`;
  contentXml += `      <text:p text:style-name="Standard"/>\n`;

  project.passages.forEach((passage) => {
    const markers = [];
    if (passage.number === 1) markers.push("[INICIO]");
    if (passage.isEndpoint) markers.push("[FIN]");
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    if (readingMode) {
      contentXml += `      <text:p text:style-name="PassageNumberCenter"><text:bookmark text:name="passage${passage.number}"/>${passage.number}${markerStr}</text:p>\n`;
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        contentXml += `      <text:p text:style-name="Standard">${convertInlineLinks(line)}</text:p>\n`;
      });
    } else {
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${escapeXml(passage.title)}`;
      contentXml += `      <text:p text:style-name="PassageNumber"><text:bookmark text:name="passage${passage.number}"/>${header}${markerStr}</text:p>\n`;
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        contentXml += `      <text:p text:style-name="Standard">${convertInlineLinks(line)}</text:p>\n`;
      });
      if (passage.outgoingLinks.length > 0) {
        contentXml += `      <text:p text:style-name="PassageNumber">Opciones:</text:p>\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          contentXml += `      <text:p text:style-name="Standard">  → `;
          contentXml += `<text:a xlink:type="simple" xlink:href="#passage${link.target.number}" text:style-name="Hyperlink">${escapeXml(text)}</text:a></text:p>\n`;
        });
      }
    }
    contentXml += `      <text:p text:style-name="Standard"/>\n`;
  });

  contentXml += `    </office:text>
  </office:body>
</office:document-content>`;

  return contentXml;
}

export function buildStylesXml(th: OfficeTheme): string {
  const fontFaces = th.fontFamilies
    .map((family) => {
      const entries = FONTS_TTF_DATA.filter((f) => f.family === family);
      if (entries.length === 0) return "";
      const uris = entries
        .map((f) => `<svg:font-face-uri xlink:href="fonts/${family.toLowerCase().replace(/[^a-z0-9]/g, "")}-${f.weight}${f.style === "italic" ? "i" : ""}.ttf" xlink:type="simple"/>`)
        .join("");
      return `    <style:font-face style:name="${family}" svg:font-family="'${family}'">\n      <svg:font-face-src>\n        ${uris}\n      </svg:font-face-src>\n    </style:font-face>\n`;
    })
    .filter(Boolean)
    .join("");

  const upperAttr = th.uppercaseHeadings ? ` fo:text-transform="uppercase" fo:letter-spacing="0.15em"` : "";
  const headingWeight = th.headingWeight === "700" ? "bold" : "normal";

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.2">
  <office:font-face-decls>
${fontFaces}  </office:font-face-decls>
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm" style:line-spacing="115%"/>
      <style:text-properties style:font-name="${th.fontFamilies[0] || "Times New Roman"}" fo:font-size="12pt" fo:color="${th.text}"/>
    </style:default-style>
    <style:style style:name="Heading1" style:family="paragraph" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm"/>
      <style:text-properties fo:font-size="24pt" fo:font-weight="${headingWeight}" fo:color="${th.accent}" style:font-name="${th.fontFamilies[th.fontFamilies.length - 1] || "Times New Roman"}"${upperAttr}/>
    </style:style>
    <style:style style:name="Heading2" style:family="paragraph" style:next-style-name="Standard">
      <style:paragraph-properties fo:margin-top="0.49cm" fo:margin-bottom="0.49cm"/>
      <style:text-properties fo:font-size="14pt" fo:font-style="italic" fo:color="${th.subtitle}" style:font-name="${th.fontFamilies[0] || "Times New Roman"}"/>
    </style:style>
    <style:style style:name="PassageNumberCenter" style:family="paragraph" style:next-style-name="Standard">
      <style:paragraph-properties fo:text-align="center"/>
      <style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="${th.accent}" style:font-name="${th.fontFamilies[th.fontFamilies.length - 1] || "Times New Roman"}"${upperAttr}/>
    </style:style>
    <style:style style:name="PassageNumber" style:family="paragraph" style:next-style-name="Standard">
      <style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="${th.accent}" style:font-name="${th.fontFamilies[th.fontFamilies.length - 1] || "Times New Roman"}"${upperAttr}/>
    </style:style>
    <style:style style:name="Standard" style:family="paragraph" style:class="text">
      <style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.49cm" style:line-spacing="115%"/>
      <style:text-properties style:font-name="${th.fontFamilies[0] || "Times New Roman"}" fo:font-size="12pt" fo:color="${th.text}"/>
    </style:style>
    <style:style style:name="Hyperlink" style:family="text">
      <style:text-properties fo:color="${th.linkInline}" style:text-underline-style="solid"/>
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
}

export const ODT_STYLES_XML = buildStylesXml(officeTheme(PDF_THEMES.clasico));

export const ODT_META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  office:version="1.2">
  <office:meta>
    <meta:generator>Secret Passage</meta:generator>
  </office:meta>
</office:document-meta>`;

export function buildManifestXml(th: OfficeTheme): string {
  const fontEntries = th.fontFamilies
    .flatMap((family) =>
      FONTS_TTF_DATA.filter((f) => f.family === family).map(
        (f) => `  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.font" manifest:full-path="fonts/${family.toLowerCase().replace(/[^a-z0-9]/g, "")}-${f.weight}${f.style === "italic" ? "i" : ""}.ttf"/>\n`
      )
    )
    .join("");

  return `<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="meta.xml"/>
${fontEntries}</manifest:manifest>`;
}

export const ODT_MANIFEST_XML = buildManifestXml(officeTheme(PDF_THEMES.clasico));

export function packOdtArchive(parts: {
  content: string;
  styles: string;
  meta: string;
  manifest: string;
  fonts?: { name: string; data: Buffer }[];
}): Promise<Buffer> {
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

    archive.append(parts.content, { name: "content.xml" });
    archive.append(parts.styles, { name: "styles.xml" });
    archive.append(parts.meta, { name: "meta.xml" });
    archive.append(parts.manifest, { name: "META-INF/manifest.xml" });

    if (parts.fonts) {
      for (const font of parts.fonts) {
        archive.append(font.data, { name: font.name });
      }
    }

    archive.finalize();
  });
}

export async function generateODT(projectId: string, readingMode = false, theme: ThemeId = "clasico"): Promise<Buffer> {
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

  const th = officeTheme(PDF_THEMES[theme] ?? PDF_THEMES.clasico);
  const contentXml = buildContentXml(
    { title: project.title, passages: project.passages },
    readingMode,
    theme
  );

  const fonts = th.fontFamilies
    .flatMap((family) =>
      FONTS_TTF_DATA.filter((f) => f.family === family).map((f) => ({
        name: `fonts/${family.toLowerCase().replace(/[^a-z0-9]/g, "")}-${f.weight}${f.style === "italic" ? "i" : ""}.ttf`,
        data: Buffer.from(f.base64, "base64"),
      }))
    );

  return packOdtArchive({
    content: contentXml,
    styles: buildStylesXml(th),
    meta: ODT_META_XML,
    manifest: buildManifestXml(th),
    fonts,
  });
}
