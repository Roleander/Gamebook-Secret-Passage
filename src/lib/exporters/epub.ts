import { findPassageLinks } from "@/lib/reference-links";
import { PDF_THEMES, officeTheme, type OfficeTheme, type ThemeId } from "@/lib/exporters/themes";
import { FONTS_DATA } from "@/lib/exporters/fonts-data";
import JSZip from "jszip";

interface EpubPassage {
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

export interface EpubProject {
  id: string;
  title: string;
  passages: EpubPassage[];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateEPUB(project: EpubProject, readingMode: boolean, theme: ThemeId = "clasico"): Promise<Buffer> {
  const zip = new JSZip();
  const th = officeTheme(PDF_THEMES[theme] ?? PDF_THEMES.clasico);

  const passageNumbers = new Set<number>(
    project.passages.map((p) => p.number)
  );

  function linkifyContent(
    content: string,
    passageNumber: number,
    forcedTargets?: ReadonlySet<number>
  ): string {
    const links = findPassageLinks(content, passageNumbers, passageNumber, forcedTargets);
    let result = "";
    let lastIndex = 0;

    for (const link of links) {
      result += escapeXml(content.slice(lastIndex, link.start));
      result += `<a href="chapter${link.target}.xhtml" style="color:${th.linkInline};border-bottom:1px dotted ${th.linkDotted}">${escapeXml(link.text)}</a>`;
      lastIndex = link.end;
    }
    result += escapeXml(content.slice(lastIndex));
    return result;
  }

  // Use passage.number consistently for file names so inline links (#passageN) match file names
  const chapterFileName = (number: number) => `chapter${number}.xhtml`;

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" as any });

  zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // Embed woff2 fonts for themed EPUBs
  const fontManifestItems: string[] = [];
  if (th.id !== "clasico") {
    FONTS_DATA.filter((f) => th.fontFamilies.includes(f.family)).forEach((f, i) => {
      const fileName = `${f.family.toLowerCase().replace(/[^a-z0-9]/g, "")}-${f.weight}${f.style === "italic" ? "i" : ""}-${i}.woff2`;
      zip.file(`OEBPS/fonts/${fileName}`, Buffer.from(f.base64, "base64"));
      fontManifestItems.push(`    <item id="font${i}" href="fonts/${fileName}" media-type="font/woff2"/>`);
    });
  }

  const fontFaceCss = th.id === "clasico"
    ? ""
    : FONTS_DATA.filter((f) => th.fontFamilies.includes(f.family))
        .map((f, i) => {
          const fileName = `${f.family.toLowerCase().replace(/[^a-z0-9]/g, "")}-${f.weight}${f.style === "italic" ? "i" : ""}-${i}.woff2`;
          return `@font-face { font-family: '${f.family}'; font-style: ${f.style}; font-weight: ${f.weight}; src: url('fonts/${fileName}') format('woff2'); }`;
        })
        .join("\n") + "\n";

  const headingRule = th.id === "clasico" ? "" : `h1, .passage-number, .passage-number-center { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; }\n`;
  const upperRule = th.uppercaseHeadings ? `h1, .passage-number, .passage-number-center { text-transform: uppercase; letter-spacing: 2px; }\n` : "";
  const pdfTh = PDF_THEMES[theme] ?? PDF_THEMES.clasico;
  const watermarkRule = pdfTh.watermarkSvg
    ? `.page-watermark { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); width: 220px; height: 220px; pointer-events: none; color: ${th.accent}; opacity: ${pdfTh.watermarkOpacity ?? 0.06}; }\nbody { position: relative; }\n`
    : "";
  const dividerRule = pdfTh.dividerSvg
    ? `.passage-divider { display: flex; justify-content: center; margin: 8px 0; color: ${th.accent}; opacity: 0.4; }\n.passage-divider svg { width: 70px; height: 8px; }\n`
    : "";
  const smallCapsRule = pdfTh.smallCaps ? `.passage-number, .passage-number-center { font-variant: small-caps; letter-spacing: 1px; }\n` : "";

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
${fontManifestItems.length ? fontManifestItems.join("\n") + "\n" : ""}${project.passages.map((p) => `    <item id="chapter${p.number}" href="${chapterFileName(p.number)}" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine>
    ${project.passages.map((p) => `<itemref idref="chapter${p.number}"/>`).join("\n    ")}
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", contentOpf);

  zip.file("OEBPS/style.css", `${fontFaceCss}${headingRule}${upperRule}${watermarkRule}${dividerRule}${smallCapsRule}body {
  font-family: ${th.fontBody};
  line-height: 1.8;
  padding: 20px;
  color: ${th.text};
}
.passage-number {
  font-size: 0.9em;
  font-weight: bold;
  color: ${th.accent};
  margin-bottom: 6px;
}
.passage-number-center {
  font-size: 0.9em;
  font-weight: bold;
  color: ${th.accent};
  margin-bottom: 6px;
  text-align: center;
}
.content {
  text-align: justify;
  margin: 10px 0;
  white-space: pre-wrap;
}
.links {
  background: ${th.linksBg};
  padding: 10px 15px;
  border-left: 3px solid ${th.linkDotted};
  margin-top: 15px;
}
.links strong { color: ${th.accent}; display: block; margin-bottom: 8px; }
a { color: ${th.linkInline}; text-decoration: none; }
.start-marker { color: #22c55e; font-size: 0.85em; }
.end-marker { color: #ef4444; font-size: 0.85em; }`);

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
      ${project.passages.map((p) => `<li><a href="${chapterFileName(p.number)}">Pasaje ${p.number}${p.title ? ` — ${escapeXml(p.title)}` : ""}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`;
  zip.file("OEBPS/nav.xhtml", navXhtml);

  project.passages.forEach((passage) => {
    const markers = [];
    if (passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
    if (passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    let linksHtml = "";
    if (!readingMode && passage.outgoingLinks.length > 0) {
      linksHtml = `<div class="links"><strong>Opciones:</strong>\n`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        linksHtml += `<p>→ <a href="${chapterFileName(link.target.number)}">${escapeXml(text)}</a></p>\n`;
      });
      linksHtml += `</div>`;
    }

    let titleLine: string;
    if (readingMode) {
      titleLine = `<p class="passage-number-center">${passage.number}${markerStr}</p>`;
    } else {
      titleLine = `<p class="passage-number">Pasaje ${passage.number}${passage.title ? ` — ${escapeXml(passage.title)}` : ""}${markerStr}</p>`;
    }

    const watermarkDiv = pdfTh.watermarkSvg
      ? `<div class="page-watermark" aria-hidden="true">${pdfTh.watermarkSvg}</div>`
      : "";
    const dividerHtml = pdfTh.dividerSvg
      ? `<div class="passage-divider" aria-hidden="true">${pdfTh.dividerSvg}</div>`
      : "";

    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es" xml:lang="es">
<head>
  <title>Pasaje ${passage.number}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>${watermarkDiv}
  ${titleLine}
  <div class="content">${linkifyContent(passage.content, passage.number, new Set(passage.outgoingLinks.map((l) => l.target.number)))}</div>
  ${linksHtml}
  ${dividerHtml}
</body>
</html>`;

    zip.file(`OEBPS/${chapterFileName(passage.number)}`, chapterXhtml);
  });

  const content = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(content);
}
