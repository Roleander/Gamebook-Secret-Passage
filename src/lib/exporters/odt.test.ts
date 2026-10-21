import { describe, expect, it } from "vitest";
import sax from "sax";
import JSZip from "jszip";
import {
  buildContentXml,
  buildStylesXml,
  buildManifestXml,
  packOdtArchive,
  ODT_STYLES_XML,
  ODT_META_XML,
  ODT_MANIFEST_XML,
} from "@/lib/exporters/odt";
import { PDF_THEMES, officeTheme } from "@/lib/exporters/themes";

const ODF_NAMESPACES = [
  "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
  "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
  "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
  "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
  "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
  "urn:oasis:names:tc:opendocument:xmlns:meta:1.0",
  "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0",
];

function xmlErrors(xml: string): string[] {
  const errors: string[] = [];
  const parser = sax.parser(true);
  parser.onerror = (e) => {
    errors.push(e.message);
    parser.resume();
  };
  parser.write(xml).close();
  return errors;
}

function samplePassage(overrides: Partial<Parameters<typeof buildContentXml>[0]["passages"][number]> = {}) {
  return {
    id: "p1",
    number: 1,
    title: null,
    content: "",
    isEndpoint: false,
    outgoingLinks: [],
    ...overrides,
  };
}

describe("ODT export", () => {
  it("declara los namespaces ODF con sufijo :1.0", () => {
    const content = buildContentXml(
      { title: "Ns", passages: [samplePassage()] },
      false
    );
    const all = [content, ODT_STYLES_XML, ODT_META_XML, ODT_MANIFEST_XML].join("\n");
    for (const uri of ODF_NAMESPACES) {
      expect(all).toContain(uri);
    }
    const declared = [...all.matchAll(/xmlns:[a-zA-Z-]+="([^"]+)"/g)].map((m) => m[1]);
    for (const uri of declared) {
      if (uri.startsWith("urn:oasis:")) {
        expect(uri.endsWith(":1.0")).toBe(true);
      }
    }
  });

  it("los cuatro documentos XML estan bien formados", () => {
    const content = buildContentXml(
      {
        title: "Prueba ODT",
        passages: [samplePassage({ number: 1, content: "Inicio\nVe al 2" }), samplePassage({ number: 2, isEndpoint: true, content: "Fin" })],
      },
      false
    );
    for (const [label, xml] of [
      ["content", content],
      ["styles", ODT_STYLES_XML],
      ["meta", ODT_META_XML],
      ["manifest", ODT_MANIFEST_XML],
    ] as const) {
      expect(xmlErrors(xml), label).toEqual([]);
    }
  });

  it("escapa caracteres hostiles y elimina controles invalidos", () => {
    const hostile = 'A & B <tag> "q" \'s\' \u0007 fin';
    const content = buildContentXml(
      { title: hostile, passages: [samplePassage({ number: 1, content: hostile })] },
      false
    );
    expect(xmlErrors(content)).toEqual([]);
    expect(content).toContain("A &amp; B &lt;tag&gt;");
    expect(content).not.toContain("\u0007");
  });

  it("enlaza solo los numeros que existen como pasajes", () => {
    const content = buildContentXml(
      {
        title: "Links",
        passages: [
          samplePassage({ number: 1, content: "Pierdes 3 PV. Ve al 2 y al 12. Opciones 1." }),
          samplePassage({ number: 2, isEndpoint: true, outgoingLinks: [{ target: { number: 1 }, linkText: "Volver" }] }),
        ],
      },
      false
    );
    expect(content).toContain('xlink:href="#passage2"');
    expect(content).toContain('xlink:href="#passage1"');
    expect(content).not.toContain("#passage3");
    expect(content).not.toContain("#passage12");
    expect(content).toContain('text:name="passage1"');
    expect(content).toContain("[INICIO]");
    expect(content).toContain("[FIN]");
  });

  it("el bookmark vive dentro del primer parrafo del pasaje y los enlaces declaran xlink:type", () => {
    const sample = {
      title: "Anclas ODT",
      passages: [
        samplePassage({ number: 1, content: "Ve al 2" }),
        samplePassage({ number: 2, isEndpoint: true, content: "Fin" }),
      ],
    };
    const normal = buildContentXml(sample, false);
    expect(normal).toContain(
      '<text:p text:style-name="PassageNumber"><text:bookmark text:name="passage1"/>'
    );
    expect(normal).not.toMatch(/<text:bookmark[^>]*\/><text:p/);
    expect(normal).toContain('xlink:type="simple" xlink:href="#passage2"');

    const reading = buildContentXml(sample, true);
    expect(reading).toContain(
      '<text:p text:style-name="PassageNumberCenter"><text:bookmark text:name="passage1"/>'
    );
    expect(reading).not.toMatch(/<text:bookmark[^>]*\/><text:p/);
    expect(xmlErrors(normal)).toEqual([]);
    expect(xmlErrors(reading)).toEqual([]);
  });

  it("packOdtArchive pone mimetype primero y sin comprimir", async () => {
    const buf = await packOdtArchive({
      content: ODT_STYLES_XML,
      styles: ODT_STYLES_XML,
      meta: ODT_META_XML,
      manifest: ODT_MANIFEST_XML,
    });
    expect(buf.readUInt32LE(0)).toBe(0x04034b50);
    const method = buf.readUInt16LE(8);
    const nameLen = buf.readUInt16LE(26);
    const extraLen = buf.readUInt16LE(28);
    const name = buf.toString("utf8", 30, 30 + nameLen);
    expect(name).toBe("mimetype");
    expect(method).toBe(0);
    const expected = "application/vnd.oasis.opendocument.text";
    const start = 30 + nameLen + extraLen;
    expect(buf.subarray(start, start + expected.length).toString("utf8")).toBe(expected);
  });

  it("el paquete contiene los cinco archivos y sus XML parsean", async () => {
    const content = buildContentXml(
      { title: "Zip", passages: [samplePassage({ number: 1, content: "Hola" })] },
      false
    );
    const buf = await packOdtArchive({
      content,
      styles: ODT_STYLES_XML,
      meta: ODT_META_XML,
      manifest: ODT_MANIFEST_XML,
    });
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(
      ["META-INF/manifest.xml", "content.xml", "meta.xml", "mimetype", "styles.xml"].sort()
    );
    for (const name of ["content.xml", "styles.xml", "meta.xml", "META-INF/manifest.xml"]) {
      const text = await zip.files[name].async("string");
      expect(xmlErrors(text), name).toEqual([]);
    }
    const mimetype = await zip.files["mimetype"].async("string");
    expect(mimetype).toBe("application/vnd.oasis.opendocument.text");
  });

  it("el tema grimorio genera estilos con fuentes embebidas y colores parchment", () => {
    const th = officeTheme(PDF_THEMES.grimorio);
    const styles = buildStylesXml(th);
    expect(styles).toContain("<office:font-face-decls>");
    expect(styles).toContain('style:name="EB Garamond"');
    expect(styles).toContain('style:name="UnifrakturMaguntia"');
    expect(styles).toContain('svg:font-face-uri');
    expect(styles).toContain('fo:color="#2a1f14"');
    expect(styles).toContain('fo:color="#8b6914"');
    expect(xmlErrors(styles)).toEqual([]);

    const manifest = buildManifestXml(th);
    expect(manifest).toContain("application/vnd.oasis.opendocument.font");
    expect(manifest).toContain('full-path="fonts/ebgaramond-400-600.ttf"');
    expect(manifest).toContain('full-path="fonts/unifrakturmaguntia-400.ttf"');
  });

  it("el tema clasico no declara fuentes embebidas", () => {
    const th = officeTheme(PDF_THEMES.clasico);
    const styles = buildStylesXml(th);
    expect(styles).not.toContain("font-face-uri");
    const manifest = buildManifestXml(th);
    expect(manifest).not.toContain("opendocument.font");
  });

  it("el tema papiro aplica Cinzel en headings y text-transform uppercase", () => {
    const th = officeTheme(PDF_THEMES.papiro);
    const styles = buildStylesXml(th);
    expect(styles).toContain('style:name="Cinzel"');
    expect(styles).toContain('fo:text-transform="uppercase"');
    expect(styles).toContain('fo:color="#6e5217"');
    expect(xmlErrors(styles)).toEqual([]);
  });

  it("los temas no clasicos añaden divisor textual entre pasajes en content.xml", () => {
    const sample = {
      title: "Divisores",
      passages: [
        samplePassage({ number: 1, content: "Ve al 2" }),
        samplePassage({ number: 2, isEndpoint: true, content: "Fin" }),
      ],
    };
    const themed = buildContentXml(sample, false, "celta");
    expect(themed).toContain('<text:p text:style-name="PassageDivider">❧</text:p>');
    expect(themed).toContain('style:name="PassageDivider"');
    expect(themed).toContain('fo:color="#4a6741"');
    expect(xmlErrors(themed)).toEqual([]);

    const clasico = buildContentXml(sample, false, "clasico");
    expect(clasico).not.toContain("PassageDivider");
    expect(clasico).not.toContain("❧");
    expect(clasico).not.toContain("automatic-styles");
  });

  it("los temas con rubricacion envuelven [INICIO] en un span de acento", () => {
    const sample = {
      title: "Rubrica",
      passages: [samplePassage({ number: 1, content: "Inicio" })],
    };
    const cruzada = buildContentXml(sample, false, "cruzada");
    expect(cruzada).toContain('<text:span text:style-name="StartMarker">[INICIO]</text:span>');
    expect(cruzada).toContain('style:name="StartMarker"');
    expect(cruzada).toContain('fo:color="#a01c1c"');
    expect(xmlErrors(cruzada)).toEqual([]);

    const celta = buildContentXml(sample, false, "celta");
    expect(celta).toContain("[INICIO]");
    expect(celta).not.toContain("StartMarker");

    const clasico = buildContentXml(sample, false, "clasico");
    expect(clasico).not.toContain("StartMarker");
  });
});
