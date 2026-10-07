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
});
