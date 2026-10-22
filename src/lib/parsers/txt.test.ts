import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  autoDetectLinks,
  detectLinksInPassage,
  extractPassagesFromText,
} from "@/lib/parsers/txt";

describe("detectLinksInPassage", () => {
  it("detects arrow, bracket and goto references", () => {
    const links = detectLinksInPassage(
      "sigue → 25 y (12) o [8]\n<<goto \"15\">>",
      [8, 12, 15, 25]
    );
    expect(links.map((l) => l.targetNumber).sort((a, b) => a - b)).toEqual([
      8, 12, 15, 25,
    ]);
  });

  it("detects references in other languages", () => {
    expect(
      detectLinksInPassage("Turn to 25 for the next chapter.", [25]).map(
        (l) => l.targetNumber
      )
    ).toEqual([25]);
    expect(
      detectLinksInPassage("Vai al passaggio 9.", [9]).map(
        (l) => l.targetNumber
      )
    ).toEqual([9]);
    expect(
      detectLinksInPassage("Allez au passage 7.", [7]).map(
        (l) => l.targetNumber
      )
    ).toEqual([7]);
  });

  it("does not detect mechanics as links", () => {
    expect(detectLinksInPassage("Pierdes 20 PV.", [20])).toEqual([]);
    expect(detectLinksInPassage("→ 20 PV.", [20])).toEqual([]);
    expect(detectLinksInPassage("del 1 al 2", [1, 2])).toEqual([]);
    expect(detectLinksInPassage("Nivel 7 te espera.", [7])).toEqual([]);
  });

  it("skips targets that do not exist", () => {
    expect(detectLinksInPassage("Ve al pasaje 40.", [1, 2])).toEqual([]);
  });

  it("deduplicates repeated targets", () => {
    const links = detectLinksInPassage("Ve al 5. Repite: → 5", [5]);
    expect(links).toHaveLength(1);
  });

  it("keeps twine goto targets", () => {
    expect(
      detectLinksInPassage('<<goto "La cueva 15">>', [15]).map(
        (l) => l.targetNumber
      )
    ).toEqual([15]);
    expect(detectLinksInPassage('<<goto "15 PV">>', [15])).toEqual([]);
  });

  it("detects numbers that only the classifier validates", () => {
    expect(
      detectLinksInPassage("Ve al 3 y 5.", [3, 5]).map((l) => l.targetNumber)
    ).toEqual([3, 5]);
    expect(
      detectLinksInPassage("<<goto 15>>", [15]).map((l) => l.targetNumber)
    ).toEqual([15]);
    expect(
      detectLinksInPassage("Elige “25” para continuar.", [25]).map(
        (l) => l.targetNumber
      )
    ).toEqual([25]);
  });
});

describe("autoDetectLinks", () => {
  it("maps detected references back to their source passages", () => {
    const links = autoDetectLinks([
      { number: 1, content: "Ve al pasaje 2." },
      { number: 2, content: "Pierdes 20 PV." },
    ]);
    expect(links).toEqual([
      { sourceNumber: 1, targetNumber: 2, text: "Ve al pasaje 2" },
    ]);
  });
});

describe("extractPassagesFromText — avisos de importación", () => {
  it("renumera el duplicado que no está en su sitio y conserva el contextual", () => {
    const r = extractPassagesFromText(
      "10\nPrimera versión del pasaje.\n\n9\nNueve.\n\n10\nVersión en secuencia.\n"
    );
    expect(r.passages.map((p) => p.number)).toEqual([9, 10, 11]);
    expect(r.passages.find((p) => p.number === 10)?.content).toContain(
      "Versión en secuencia."
    );
    const dup = r.passages.find((p) => p.number === 11);
    expect(dup?.title).toBe("10 (duplicado)");
    expect(dup?.content).toContain("Primera versión del pasaje.");
    expect(
      r.warnings.some((w) => w.includes("Pasaje 10 duplicado") && w.includes("11"))
    ).toBe(true);
  });

  it("conserva la primera aparición cuando la segunda no está en contexto", () => {
    const r = extractPassagesFromText("1\nUno.\n\n2\nDos.\n\n1\nOtra vez.\n");
    expect(r.passages.map((p) => p.number)).toEqual([1, 2, 3]);
    expect(r.passages[2].content).toContain("Otra vez.");
    expect(r.passages[2].title).toBe("1 (duplicado)");
    expect(r.warnings.some((w) => w.includes("Pasaje 1 duplicado"))).toBe(true);
  });

  it("rechaza cabeceras no enteras con aviso", () => {
    const r = extractPassagesFromText(
      "1\nTexto inicial con fin.\n\n7,5\nLínea que no abre pasaje.\n\n2\nSegundo texto.\n"
    );
    expect(r.passages.map((p) => p.number)).toEqual([1, 2]);
    expect(r.passages[0].content).toContain("7,5");
    expect(r.warnings.some((w) => w.includes("no entero"))).toBe(true);
  });

  it("avisa de pasajes con placeholder de contenido", () => {
    const r = extractPassagesFromText(
      "1\nAquí hay texto.\n\n217\n(Escribe aquí el contenido de este pasaje)\n"
    );
    expect(
      r.warnings.some((w) => w.includes("Pasaje 217") && w.includes("placeholder"))
    ).toBe(true);
  });

  it("avisa cuando una referencia apunta a un pasaje inexistente", () => {
    const r = extractPassagesFromText("1\nSigue en el pasaje 99.\n\n2\nFin.\n");
    expect(r.warnings.some((w) => w.includes("apunta al 99"))).toBe(true);
    expect(r.links).toEqual([]);
  });

  it("avisa de umbrales sospechosos de 3 o más cifras", () => {
    const r = extractPassagesFromText(
      "1\nRealiza una tirada y suma el resultado. Si es igual o menor a 245, ve al 2.\n\n2\nFin\n"
    );
    expect(
      r.warnings.some((w) => w.includes("245") && w.includes("umbral"))
    ).toBe(true);
    expect(r.links.some((l) => l.targetNumber === 2)).toBe(true);
  });

  it("no confunde un umbral con el destino de un enlace", () => {
    const r = extractPassagesFromText(
      "1\nSi es menor, ve al 196.\n\n196\nFin\n"
    );
    expect(r.warnings.some((w) => w.includes("umbral"))).toBe(false);
    expect(r.links.some((l) => l.targetNumber === 196)).toBe(true);
  });

  it("las opciones usan el destino del enlace, no la primera cifra", () => {
    const r = extractPassagesFromText(
      "1\nElige.\nSi el resultado es mayor o igual a 10, pasa al 46\n\n46\nFin\n"
    );
    const p1 = r.passages.find((p) => p.number === 1)!;
    const opt = p1.options?.find((o) => o.text.includes("46"));
    expect(opt?.targetNumber).toBe(46);
    expect(
      r.links.some((l) => l.sourceNumber === 1 && l.targetNumber === 46)
    ).toBe(true);
  });

  it("detecta destino partido en dos líneas", () => {
    const r = extractPassagesFromText(
      "1\nPase lo que pase, tu camino continúa hacia el destino: ve al \n121.\n\n121\nFin\n"
    );
    expect(
      r.links.some((l) => l.sourceNumber === 1 && l.targetNumber === 121)
    ).toBe(true);
  });

  it("detecta 've a N' y 'al enlace N'", () => {
    const veA = extractPassagesFromText(
      "1\nSi es menor o igual a esa cantidad, ve a 601.\n\n601\nFin\n"
    );
    expect(veA.links.some((l) => l.targetNumber === 601)).toBe(true);

    const enlace = extractPassagesFromText(
      "1\nRealiza una tirada y suma el modificador al resultado. Si es igual o menor a 245, pasa al enlace 158.\n\n158\nFin\n"
    );
    expect(enlace.links.some((l) => l.targetNumber === 158)).toBe(true);
    expect(enlace.warnings.some((w) => w.includes("245"))).toBe(true);
  });
});

describe("extractPassagesFromText — fixture Acto I", () => {
  const sample = readFileSync(
    join(process.cwd(), "src", "lib", "parsers", "fixtures", "acto-i-sample.txt"),
    "utf8"
  );

  it("parsea los formatos reales del Acto I con sus avisos", () => {
    const r = extractPassagesFromText(sample);
    expect(r.passages.map((p) => p.number)).toEqual([
      33, 121, 139, 158, 217, 277, 601,
    ]);
    expect(r.links).toContainEqual(
      expect.objectContaining({ sourceNumber: 33, targetNumber: 121 })
    );
    expect(r.links).toContainEqual(
      expect.objectContaining({ sourceNumber: 139, targetNumber: 158 })
    );
    expect(
      r.warnings.some((w) => w.includes("Pasaje 139") && w.includes("umbral"))
    ).toBe(true);
    expect(
      r.warnings.some((w) => w.includes("Pasaje 217") && w.includes("placeholder"))
    ).toBe(true);
    expect(r.warnings.some((w) => w.includes("apunta al 73"))).toBe(true);
  });
});

describe("extractPassagesFromText — detección estricta de finales", () => {
  it("no marca pasajes que solo contienen la palabra fin en medio del texto", () => {
    const r = extractPassagesFromText("1\nAl fin del camino hay una cueva.\n");
    expect(r.passages.find((p) => p.number === 1)?.isEndpoint).toBe(false);
  });

  it("marca como final si la última línea es un marcador FIN", () => {
    const r = extractPassagesFromText("1\nEl héroe descansa.\nFIN.");
    expect(r.passages.find((p) => p.number === 1)?.isEndpoint).toBe(true);
  });

  it("acepta FIN DEL JUEGO decorado y FIN I VOLUMEN", () => {
    expect(
      extractPassagesFromText("1\nDerrota total.\n— FIN DEL JUEGO —")
        .passages[0].isEndpoint
    ).toBe(true);
    expect(
      extractPassagesFromText("1\nVolumen cerrado.\nFIN I VOLUMEN")
        .passages[0].isEndpoint
    ).toBe(true);
  });

  it("no marca finales de acto que continúan en otro pasaje", () => {
    const r = extractPassagesFromText(
      "1\nCierre de escena.\nFIN DEL ACTO PRIMERO.\nSigue en el pasaje 178"
    );
    expect(r.passages.find((p) => p.number === 1)?.isEndpoint).toBe(false);
  });

  it("no marca como final si el pasaje tiene opciones", () => {
    const r = extractPassagesFromText(
      "1\nParece el final.\n\tSalvarme con la espada\nFIN"
    );
    expect(r.passages.find((p) => p.number === 1)?.isEndpoint).toBe(false);
  });
});
