import { describe, expect, it } from "vitest";
import { classifyNumber } from "@/lib/reference-classifier";

function classifyAt(text: string, needle: string, occurrence = 1) {
  let index = -1;
  for (let i = 0; i < occurrence; i++) {
    index = text.indexOf(needle, index + 1);
  }
  expect(index).toBeGreaterThanOrEqual(0);
  return classifyNumber(text, index, needle.length);
}

describe("classifyNumber", () => {
  it("recognizes spanish references", () => {
    expect(classifyAt("Ve al pasaje 12.", "12")).toBe("reference");
    expect(classifyAt("pasa al 3", "3")).toBe("reference");
    expect(classifyAt("[Ve al pasaje 42]", "42")).toBe("reference");
    expect(classifyAt("al 1 y al 12", "12")).toBe("reference");
    expect(classifyAt("Vuelves al pasaje 1.", "1")).toBe("reference");
  });

  it("recognizes bracketed and arrow references", () => {
    expect(classifyAt("elige (12)", "12")).toBe("reference");
    expect(classifyAt("[12]", "12")).toBe("reference");
    expect(classifyAt("«12»", "12")).toBe("reference");
    expect(classifyAt("continúa → 12", "12")).toBe("reference");
    expect(classifyAt("sigue -> 12", "12")).toBe("reference");
  });

  it("recognizes references in other languages", () => {
    expect(classifyAt("Turn to 25.", "25")).toBe("reference");
    expect(classifyAt("Continue to passage 7", "7")).toBe("reference");
    expect(classifyAt("Allez au passage 9", "9")).toBe("reference");
    expect(classifyAt("Gehe zu Abschnitt 4", "4")).toBe("reference");
    expect(classifyAt("Vai al passaggio 5", "5")).toBe("reference");
    expect(classifyAt("Vá para a seção 6", "6")).toBe("reference");
    expect(classifyAt("Idź do sekcji 8", "8")).toBe("reference");
    expect(classifyAt("Gå till avsnitt 11", "11")).toBe("reference");
    expect(classifyAt("Jdi do oddílu 14", "14")).toBe("reference");
    expect(classifyAt("अनुच्छेद 12 पढ़ो", "12")).toBe("reference");
    expect(classifyAt("パッセージ 12 へ", "12")).toBe("reference");
  });

  it("supports elliptical lists after a keyword", () => {
    expect(classifyAt("pasaje 123 y 12", "12")).toBe("reference");
    expect(classifyAt("pasajes 1, 2 y 3", "3")).toBe("reference");
    expect(classifyAt("pasajes 1, 2 y 3", "2")).toBe("reference");
  });

  it("rejects game mechanics and units", () => {
    expect(classifyAt("Pierdes 20 PV.", "20")).toBe("not-reference");
    expect(classifyAt("Ganas 50 XP", "50")).toBe("not-reference");
    expect(classifyAt("cuesta 30 monedas", "30")).toBe("not-reference");
    expect(classifyAt("recibes 5 PM", "5")).toBe("not-reference");
    expect(classifyAt("hace 3 km", "3")).toBe("not-reference");
    expect(classifyAt("al 20 PV", "20")).toBe("not-reference");
    expect(classifyAt("al 50%", "50")).toBe("not-reference");
  });

  it("rejects ranges", () => {
    expect(classifyAt("del 1 al 2", "1")).toBe("not-reference");
    expect(classifyAt("del 1 al 2", "2")).toBe("not-reference");
    expect(classifyAt("nivel 1-10", "1")).toBe("not-reference");
    expect(classifyAt("nivel 1-10", "10")).toBe("not-reference");
    expect(classifyAt("del pasaje 1 al pasaje 2", "2")).toBe("not-reference");
    expect(classifyAt("turn to 5 through 9", "5")).toBe("not-reference");
  });

  it("rejects decimals, thousands, levels and page numbers", () => {
    expect(classifyAt("tira 3,5", "3")).toBe("not-reference");
    expect(classifyAt("1.000 monedas", "1")).toBe("not-reference");
    expect(classifyAt("Nivel 5", "5")).toBe("not-reference");
    expect(classifyAt("página 20", "20")).toBe("not-reference");
    expect(classifyAt("capítulo 7", "7")).toBe("not-reference");
    expect(classifyAt("daño 12:30", "12")).toBe("not-reference");
  });

  it("classifies bare numbers without signals as ambiguous", () => {
    expect(classifyAt("Llegas 45 al final", "45")).toBe("ambiguous");
    expect(classifyAt("La batalla 7 fue dura", "7")).toBe("ambiguous");
    expect(classifyNumber("7", 0, 1)).toBe("ambiguous");
    expect(classifyAt("Ganas 7 y sigues", "7")).toBe("ambiguous");
  });

  it("treats twine goto targets as references", () => {
    expect(classifyAt('<<goto "25">>', "25")).toBe("reference");
    expect(classifyAt('<<goto "La cueva 25">>', "25")).toBe("reference");
    expect(classifyAt('<<goto "25 PV">>', "25")).toBe("not-reference");
  });
});
