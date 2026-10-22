import { describe, expect, it } from "vitest";
import {
  findReferenceTargets,
  missingReferenceTargets,
  referencesTo,
  removeSentencesContainingReference,
} from "@/lib/reference-mentions";

describe("findReferenceTargets", () => {
  it("devuelve los números referenciados en orden y sin repetir", () => {
    expect(
      findReferenceTargets("Continúa en el pasaje 5. Luego ve al 7.")
    ).toEqual([5, 7]);
    expect(findReferenceTargets("Ve al 7. Otra vez ve al 7.")).toEqual([7]);
  });

  it("ignora números que no son referencias de pasaje", () => {
    expect(findReferenceTargets("Consigues 3 monedas.")).toEqual([]);
    expect(findReferenceTargets("El capítulo 3 termina aquí.")).toEqual([]);
    expect(findReferenceTargets("Si el resultado es 245, continúa.")).toEqual(
      []
    );
    expect(findReferenceTargets("4")).toEqual([]);
  });

  it("detecta destinos partidos entre líneas", () => {
    expect(findReferenceTargets("Ve al\n121.")).toEqual([121]);
  });
});

describe("referencesTo", () => {
  it("true solo para referencias clasificadas al objetivo", () => {
    expect(referencesTo("Luego ve al 4.", 4)).toBe(true);
    expect(referencesTo("Luego ve al 4.", 5)).toBe(false);
    expect(referencesTo("Ganas 4 monedas.", 4)).toBe(false);
  });
});

describe("missingReferenceTargets", () => {
  it("filtra los destinos que sí existen", () => {
    const existing = new Set([5]);
    expect(missingReferenceTargets("Ve al 5 y ve al 9.", existing)).toEqual([
      9,
    ]);
    expect(missingReferenceTargets("Ve al 5.", existing)).toEqual([]);
  });
});

describe("removeSentencesContainingReference", () => {
  it("elimina la frase con la referencia y su espaciado", () => {
    const content = "Tomas la espada. Luego ve al 4. Descansas un rato.";
    expect(removeSentencesContainingReference(content, 4)).toBe(
      "Tomas la espada. Descansas un rato."
    );
  });

  it("elimina frases que abarcan varios saltos de línea", () => {
    const content = "Abres la puerta.\n\nVe al\n121.\n\nFin.";
    expect(removeSentencesContainingReference(content, 121)).toBe(
      "Abres la puerta.\n\nFin."
    );
  });

  it("devuelve el contenido sin cambios si no hay referencias", () => {
    const content = "Tomas la espada. Miras alrededor.";
    expect(removeSentencesContainingReference(content, 4)).toBe(content);
  });

  it("devuelve cadena vacía si todo son referencias", () => {
    expect(removeSentencesContainingReference("Ve al 4.", 4)).toBe("");
  });
});
