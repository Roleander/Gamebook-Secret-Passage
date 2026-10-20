import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildDocxBuffer } from "@/lib/exporters/docx";

interface TestPassage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isEndpoint: boolean;
  outgoingLinks: { target: { number: number }; linkText: string | null }[];
}

function passage(overrides: Partial<TestPassage> = {}): TestPassage {
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

const project = {
  title: "Docx anchors",
  passages: [
    passage({ number: 1, content: "Ve al 2", outgoingLinks: [{ target: { number: 2 }, linkText: "Seguir" }] }),
    passage({ number: 2, isEndpoint: true, content: "Vuelve al 1" }),
  ],
};

async function documentXml(readingMode: boolean): Promise<string> {
  const buf = await buildDocxBuffer(project, readingMode);
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file("word/document.xml");
  expect(entry).not.toBeNull();
  return entry!.async("string");
}

describe("DOCX export (buildDocxBuffer)", () => {
  it("declara bookmarks con nombre passageN sin guion", async () => {
    const xml = await documentXml(false);
    expect(xml).toContain('w:name="passage1"');
    expect(xml).toContain('w:name="passage2"');
    expect(xml).not.toMatch(/passage-\d/);
  });

  it("los hipervinculos internos usan w:anchor passageN sin guion", async () => {
    const xml = await documentXml(false);
    expect(xml).toContain('w:anchor="passage2"');
    expect(xml).toContain('w:anchor="passage1"');
    expect(xml).not.toMatch(/w:anchor="passage-/);
  });

  it("en readingMode tambien ancla cada pasaje", async () => {
    const xml = await documentXml(true);
    expect(xml).toContain('w:name="passage1"');
    expect(xml).toContain('w:anchor="passage2"');
  });

  it("el tema clasico no embebe fuentes extra", async () => {
    const buf = await buildDocxBuffer(project, false, "clasico");
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files);
    expect(names.filter((n) => n.startsWith("word/fonts/"))).toEqual([]);
  });

  it("el tema grimorio embebe fuentes TTF en el paquete docx", async () => {
    const buf = await buildDocxBuffer(project, false, "grimorio");
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files);
    const fontFiles = names.filter((n) => n.startsWith("word/fonts/") && n.endsWith(".odttf"));
    expect(fontFiles.length).toBeGreaterThan(0);
    const xml = await zip.files["word/document.xml"].async("string");
    expect(xml).toContain("UnifrakturMaguntia");
    expect(xml).toContain("EB Garamond");
  });

  it("el tema papiro embebe Cinzel y colores", async () => {
    const buf = await buildDocxBuffer(project, false, "papiro");
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files);
    expect(names.filter((n) => n.startsWith("word/fonts/")).length).toBeGreaterThan(0);
    const xml = await zip.files["word/document.xml"].async("string");
    expect(xml).toContain("Cinzel");
  });
});
