import { exportableLinks, exportableTargets, findPassageLinks } from "@/lib/reference-links";
import { fetchIllustrations } from "@/lib/illustration";
import { PDF_THEMES, officeTheme, type OfficeTheme, type ThemeId } from "@/lib/exporters/themes";
import { FONTS_DATA } from "@/lib/exporters/fonts-data";
import JSZip from "jszip";

interface EpubPassage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isEndpoint: boolean;
  illustration?: string | null;
  illustrationAlt?: string | null;
  outgoingLinks: {
    targetId?: string | null;
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

export async function generateEPUB(project: EpubProject, readingMode: boolean, theme: ThemeId = "clasico", showPassageMarkers = true): Promise<Buffer> {
  const zip = new JSZip();
  const th = officeTheme(PDF_THEMES[theme] ?? PDF_THEMES.clasico);

  const passageNumbers = new Set<number>(
    project.passages.map((p) => p.number)
  );
  const passageIds = new Set<string>(project.passages.map((p) => p.id));

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

  const illustrations = await fetchIllustrations(project.passages);
  const illustrationManifestItems: string[] = [];
  const illustrationByNumber = new Map<
    number,
    { href: string; alt: string }
  >();
  const passageByNumber = new Map(project.passages.map((p) => [p.number, p]));
  for (const [number, image] of illustrations) {
    const fileName = `passage-${number}.${image.ext}`;
    const href = `images/${fileName}`;
    const alt = passageByNumber.get(number)?.illustrationAlt?.trim() || "";
    zip.file(`OEBPS/${href}`, image.data);
    illustrationManifestItems.push(
      `    <item id="ill${number}" href="${href}" media-type="${image.mime}"/>`
    );
    illustrationByNumber.set(number, { href, alt });
  }
  const watermarkRule = pdfTh.watermarkSvg
    ? `.page-watermark { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); width: 220px; height: 220px; pointer-events: none; color: ${th.accent}; opacity: ${pdfTh.watermarkOpacity ?? 0.06}; }\nbody { position: relative; }\n`
    : "";
  const dividerRule = pdfTh.dividerSvg
    ? `.passage-divider { display: flex; justify-content: center; margin: 8px 0; color: ${th.accent}; opacity: 0.4; }\n.passage-divider svg { width: 70px; height: 8px; }\n`
    : "";
  const smallCapsRule = pdfTh.smallCaps ? `.passage-number, .passage-number-center { font-variant: small-caps; letter-spacing: 1px; }\n` : "";
  const dropCapRule = pdfTh.dropCap
    ? `.content::first-letter { font-family: ${th.fontHeading}; font-weight: ${th.headingWeight}; font-size: 2.8em; float: left; line-height: 0.9; padding: 2px 6px 0 0; color: ${th.accent};${pdfTh.dropCapBoxed ? ` background: ${th.linkInline}; color: ${th.paperBg}; border: 1px solid ${th.linkDotted};` : ""} }\n`
    : "";
  const frameRule = pdfTh.pageFrame
    ? `body { border: 1px solid ${th.linksBorder}; outline: 1px solid ${th.linksBorder}; outline-offset: -6px; }\n`
    : "";
  const iluminado = pdfTh.id === "iluminado";
  const ornamentCss = iluminado
    ? `.chapter-frame { border: 2px solid ${th.linksBorder}; outline: 1px solid ${th.accent}; outline-offset: -7px; padding: 18px 16px 22px; background: ${th.paperBg}; }
.medallion { display: flex; justify-content: center; margin: 4px 0 14px; }
.medallion svg { width: 132px; height: 132px; }
.chapter-frieze { margin-top: 20px; }
.chapter-frieze svg { display: block; width: 100%; height: auto; }
`
    : "";

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
${fontManifestItems.length ? fontManifestItems.join("\n") + "\n" : ""}${illustrationManifestItems.length ? illustrationManifestItems.join("\n") + "\n" : ""}${project.passages.map((p) => `    <item id="chapter${p.number}" href="${chapterFileName(p.number)}" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine>
    ${project.passages.map((p) => `<itemref idref="chapter${p.number}"/>`).join("\n    ")}
  </spine>
</package>`;
  zip.file("OEBPS/content.opf", contentOpf);

  zip.file("OEBPS/style.css", `${fontFaceCss}${headingRule}${upperRule}${watermarkRule}${dividerRule}${smallCapsRule}${dropCapRule}${frameRule}${ornamentCss}body {
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
.end-marker { color: #ef4444; font-size: 0.85em; }
.passage-illustration { margin: 12px 0 16px; text-align: center; }
.passage-illustration img { max-width: 100%; height: auto; }
.passage-illustration figcaption { margin-top: 5px; font-size: 0.85em; font-style: italic; color: ${th.subtitle}; }`);

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
    if (showPassageMarkers && passage.number === 1) markers.push('<span class="start-marker">[INICIO]</span>');
    if (showPassageMarkers && passage.isEndpoint) markers.push('<span class="end-marker">[FIN]</span>');
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    let linksHtml = "";
    const options = exportableLinks(passage.outgoingLinks, passageIds, passage.number);
    if (!readingMode && options.length > 0) {
      linksHtml = `<div class="links"><strong>Opciones:</strong>\n`;
      options.forEach((link) => {
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
    const uniqueSvg = (source: string, id: string) => source.replace(/__ID__/g, id);
    const medallionHtml =
      iluminado && pdfTh.medallionSvg
        ? `<div class="medallion" aria-hidden="true">${uniqueSvg(pdfTh.medallionSvg, `med${passage.number}`)}</div>`
        : "";
    const friezeHtml =
      iluminado && pdfTh.friezeSvg
        ? `<div class="chapter-frieze" aria-hidden="true">${uniqueSvg(pdfTh.friezeSvg, `frz${passage.number}`)}</div>`
        : "";
    const illustration = illustrationByNumber.get(passage.number);
    const illustrationHtml = illustration
      ? `<figure class="passage-illustration"><img src="${illustration.href}" alt="${escapeXml(illustration.alt)}"/>${illustration.alt ? `<figcaption>${escapeXml(illustration.alt)}</figcaption>` : ""}</figure>`
      : "";

    const chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es" xml:lang="es">
<head>
  <title>Pasaje ${passage.number}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>${watermarkDiv}
  <div class="chapter-frame">
    ${medallionHtml}
    ${titleLine}
    ${illustrationHtml}
    <div class="content">${linkifyContent(passage.content, passage.number, exportableTargets(passage.outgoingLinks, passageIds, passage.number))}</div>
    ${linksHtml}
    ${dividerHtml}
    ${friezeHtml}
  </div>
</body>
</html>`;

    zip.file(`OEBPS/${chapterFileName(passage.number)}`, chapterXhtml);
  });

  const content = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(content);
}
