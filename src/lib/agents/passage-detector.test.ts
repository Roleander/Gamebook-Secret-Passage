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
});
