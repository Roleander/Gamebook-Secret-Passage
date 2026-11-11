import { describe, expect, it } from "vitest";
import { addModernNameTree, hasModernNameTree } from "@/lib/pdf-destinations";

function buildPdf(objects: string[]): Buffer {
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

function chromeLikePdf(): Buffer {
  return buildPdf([
    "<</Type /Catalog /Pages 2 0 R /Dests 4 0 R>>",
    "<</Type /Pages /Count 1 /Kids [3 0 R]>>",
    "<</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]>>",
    "<</passage2 [3 0 R /XYZ 88 700 0] /passage1 [3 0 R /XYZ 88 500 0]>>",
    "<</Title (Prueba)>>",
  ]);
}

describe("árbol moderno de destinos PDF", () => {
  it("añade /Names /Dests con los destinos heredados ordenados", () => {
    const original = chromeLikePdf();
    const out = addModernNameTree(original);
    const text = out.toString("latin1");

    expect(hasModernNameTree(original)).toBe(false);
    expect(hasModernNameTree(out)).toBe(true);
    expect(text).toContain("/Names << /Dests 6 0 R >>");
    expect(text).toContain(
      "<</Names [(passage1) [3 0 R /XYZ 88 500 0] (passage2) [3 0 R /XYZ 88 700 0]]>>"
    );
    // El catálogo antiguo se conserva y se le añade el árbol.
    expect(text).toContain("<</Type /Catalog /Pages 2 0 R /Dests 4 0 R /Names << /Dests 6 0 R >>");
    // La actualización es incremental y apunta al xref anterior.
    expect(text).toContain("/Size 8");
    expect(text).toContain("/Root 7 0 R");
    expect(text).toContain("/Prev ");
    expect(text).toContain("/Info 5 0 R");
  });

  it("los offsets del xref nuevo apuntan a los objetos nuevos", () => {
    const out = addModernNameTree(chromeLikePdf());
    const text = out.toString("latin1");
    const startxref = Number(/startxref\s+(\d+)/.exec(text.slice(text.lastIndexOf("startxref")))?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");

    const section = /xref\n6 2\n(\d{10}) 00000 n \n(\d{10}) 00000 n \n/.exec(
      text.slice(startxref)
    );
    expect(section).not.toBeNull();
    const namesOffset = Number(section![1]);
    const catalogOffset = Number(section![2]);
    expect(text.slice(namesOffset, namesOffset + 7)).toBe("6 0 obj");
    expect(text.slice(catalogOffset, catalogOffset + 7)).toBe("7 0 obj");
  });

  it("es idempotente: un PDF que ya tiene árbol de nombres queda igual", () => {
    const once = addModernNameTree(chromeLikePdf());
    const twice = addModernNameTree(once);
    expect(twice.equals(once)).toBe(true);
  });

  it("devuelve intacto un PDF sin /Dests o sin catálogo válido", () => {
    const noDests = buildPdf([
      "<</Type /Catalog /Pages 2 0 R>>",
      "<</Type /Pages /Count 0 /Kids []>>",
      "<</Title (Nada)>>",
    ]);
    expect(addModernNameTree(noDests).equals(noDests)).toBe(true);

    const broken = Buffer.from("%PDF-1.4\nesto no es un pdf\n", "latin1");
    expect(addModernNameTree(broken).equals(broken)).toBe(true);
  });

  it("no toca un PDF cifrado", () => {
    const text = chromeLikePdf().toString("latin1").replace(
      "/Info 5 0 R >>",
      "/Info 5 0 R /Encrypt 9 0 R >>"
    );
    const encrypted = Buffer.from(text, "latin1");
    expect(addModernNameTree(encrypted).equals(encrypted)).toBe(true);
  });
});
