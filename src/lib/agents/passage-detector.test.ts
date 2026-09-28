import { describe, expect, it } from "vitest";
import { createPassageDetector } from "@/lib/agents/passage-detector";

describe("PassageDetectorAgent", () => {
  it("returns at least one passage for plain text", () => {
    const passages = createPassageDetector().detect("Un simple texto sin marcadores.");
    expect(passages).toHaveLength(1);
    expect(passages[0].content).toContain("Un simple texto");
  });

  it("splits numbered passages", () => {
    const text = [
      "1. Empieza aquí",
      "Contenido del primero.",
      "",
      "2. Segundo pasaje",
      "Contenido del segundo.",
      "",
      "3. Tercer pasaje",
      "Fin.",
    ].join("\n");

    const passages = createPassageDetector().detect(text);
    expect(passages.length).toBeGreaterThanOrEqual(3);
    expect(passages[0].content).toContain("Empieza aquí");
    expect(passages.some((p) => p.content.includes("Segundo pasaje"))).toBe(true);
    expect(passages[passages.length - 1].content).toContain("Tercer pasaje");
  });

  it("splits passages by --- separators", () => {
    const text = "Primera parte\nmás texto\n---\nSegunda parte\notra línea";
    const passages = createPassageDetector().detect(text);

    expect(passages.length).toBeGreaterThanOrEqual(2);
    expect(passages[0].content).toContain("Primera parte");
    expect(passages[passages.length - 1].content).toContain("Segunda parte");
  });

  it("keeps confidence within [0, 1]", () => {
    const passages = createPassageDetector().detect("1. uno\ntexto\n2. dos\nfin");
    expect(passages.length).toBeGreaterThan(0);
    for (const passage of passages) {
      expect(passage.confidence).toBeGreaterThanOrEqual(0);
      expect(passage.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("suggests sequential numbers for every passage", () => {
    const detector = createPassageDetector();
    const passages = detector.detect("1. a\nb\n2. c\nd");
    expect(detector.suggestNumbers(passages)).toEqual(
      passages.map((_, index) => index + 1)
    );
  });

  it("detects conditional gamebook links as boundary markers", () => {
    const text = [
      "Estás en la cueva.",
      "Si tienes la espada, ve al pasaje 12.",
      "",
      "Llegas a la salida.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages.length).toBeGreaterThanOrEqual(1);
    expect(passages[0].content).toContain("cueva");
  });

  it("does not invent passages in a continuous text without markers", () => {
    const text = [
      "Te despiertas sin recordar cómo llegaste hasta aquí,",
      "con la cabeza pesada y un frío que se te mete en los huesos.",
      "Delante de ti se alza una muralla cubierta de hiedra",
      "y una puerta de madera entreabierta que cruje con el viento.",
      "",
      "El guardia que custodia el paso te mira con desconfianza",
      "y apoya la lanza contra el suelo mientras decides qué hacer.",
      "A tu izquierda hay un sendero estrecho que baja hacia el río,",
      "y a la derecha una escalera que asciende hasta las almenas.",
    ].join("\n");

    const detector = createPassageDetector();
    const passages = detector.detect(text);

    expect(passages).toHaveLength(1);
    expect(passages[0].content).toBe(text.trim());
    expect(passages[0].confidence).toBe(0);
    expect(passages[0].markers).toEqual([]);
    expect(detector.suggestNumbers(passages)).toEqual([1]);
  });

  it("splits passages separated by *** lines", () => {
    const text = [
      "Primer tramo con prosa.",
      "Segunda línea del tramo.",
      "***",
      "Segundo tramo con prosa.",
      "Otra línea del tramo.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("Primer tramo");
    expect(passages[1].content).toContain("Segundo tramo");
  });

  it("splits passages separated by === lines", () => {
    const text = [
      "Primer tramo con prosa.",
      "Segunda línea del tramo.",
      "===",
      "Segundo tramo con prosa.",
      "Otra línea del tramo.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("Primer tramo");
    expect(passages[1].content).toContain("Segundo tramo");
  });

  it("splits at lines starting with 'pasaje N'", () => {
    const text = [
      "Estás junto al árbol.",
      "La hoja cruje al moverse.",
      "Pasaje 5 empieza con niebla.",
      "Oscurece de golpe.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("árbol");
    expect(passages[1].content).toContain("niebla");
  });

  it("splits at lines starting with 'section N'", () => {
    const text = [
      "Primer bloque de prosa.",
      "Otra línea aquí.",
      "section 2 comienza tras el umbral.",
      "Texto posterior al umbral.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[1].content).toContain("umbral.");
    expect(passages[1].content).toContain("posterior");
  });

  it("splits at lines starting with 'capitulo N'", () => {
    const text = [
      "Primer bloque de prosa.",
      "Otra línea aquí.",
      "capitulo 3 arranca con el ruido.",
      "Texto posterior al ruido.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[1].content).toContain("ruido.");
    expect(passages[1].content).toContain("posterior");
  });

  it("splits at bracket links [ve al pasaje N]", () => {
    const text = [
      "Caminas por el puente.",
      "El viento golpea con fuerza.",
      "[ve al pasaje 4] aparece en el pergamino.",
      "Guardas el pergamino.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("puente");
    expect(passages[1].content).toContain("pergamino");
  });

  it("splits at conditional 'continua en N' links", () => {
    const text = [
      "Pisas la tabla suelta.",
      "El piso cede bajo tus pies.",
      "Si pierdes el agarre, continua en 4.",
      "Caes a la habitación inferior.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("tabla suelta");
    expect(passages[1].content).toContain("inferior");
  });

  it("splits when an end marker appears in a line", () => {
    const text = [
      "Sientes el frío en las manos.",
      "La oscuridad te envuelve por completo.",
      "Y entonces llega tu muerte.",
      "Nada más queda después.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toContain("frío");
    expect(passages[1].content).toContain("muerte");
  });

  it("splits irregular numbering: '2)' and '3 ' prefixes", () => {
    const text = [
      "Uno con prosa.",
      "Línea de apoyo.",
      "2) Dos con paréntesis.",
      "Más contenido.",
      "3 Tres sin punto final.",
      "Cierre del bloque.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(3);
    expect(passages[0].content).toContain("Uno");
    expect(passages[1].content).toContain("Dos");
    expect(passages[2].content).toContain("Tres");
  });

  it("does not split on title-like lines alone (score below threshold)", () => {
    const text = [
      "La historia comienza en silencio.",
      "Nadie mueve pieza en el tablero.",
      "",
      "EL GRAN TÍTULO",
      "",
      "El juego vuelve a empezar por otro lado.",
    ].join("\n");
    const passages = createPassageDetector().detect(text);
    expect(passages).toHaveLength(1);
    expect(passages[0].content).toBe(text.trim());
  });
});
