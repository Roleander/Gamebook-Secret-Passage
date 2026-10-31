import { describe, expect, it } from "vitest";
import { parseFile } from "@/lib/parsers";

describe("parseFile — html conserva las cabeceras numeradas", () => {
  it("parte los pasajes de un html con parrafos", async () => {
    const html = [
      "<html><body>",
      "<p>45</p>",
      "<p>Fallas el lanzamiento del sortilegio.</p>",
      "<p>17</p>",
      "<p>Una terrible descarga eléctrica.</p>",
      "</body></html>",
    ].join("\n");

    const result = await parseFile(Buffer.from(html, "utf8"), "acto.html");

    expect(result.errors).toEqual([]);
    expect(result.passages.map((p) => p.number)).toEqual([17, 45]);
    expect(result.passages.find((p) => p.number === 45)?.content).toBe(
      "Fallas el lanzamiento del sortilegio."
    );
    expect(result.passages.find((p) => p.number === 17)?.content).toBe(
      "Una terrible descarga eléctrica."
    );
  });

  it("respeta los saltos de linea de <br> y etiquetas de bloque", async () => {
    const html =
      "<div>1</div><p>Uno aqui.</p><br><div>2</div><p>Lo otro.</p>";

    const result = await parseFile(Buffer.from(html, "utf8"), "captura.html");

    expect(result.passages.map((p) => p.number)).toEqual([1, 2]);
    expect(result.passages.find((p) => p.number === 1)?.content).toContain(
      "Uno aqui."
    );
    expect(result.passages.find((p) => p.number === 2)?.content).toContain(
      "Lo otro."
    );
  });
});
