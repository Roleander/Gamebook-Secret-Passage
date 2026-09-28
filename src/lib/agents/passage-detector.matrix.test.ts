import { describe, expect, it } from "vitest";
import { createPassageDetector } from "@/lib/agents/passage-detector";

/**
 * Matriz de efectividad de la detección sobre textos "sucios":
 * para cada fixture se declara el ground truth (líneas donde debe
 * empezar cada pasaje, sin incluir la línea 0) y se comparan las
 * fronteras predichas contra GT en precisión/recall/F1.
 */

type Fixture = {
  name: string;
  markers: string;
  text: string;
  gt: number[];
  expected: number[]; // fronteras que el detector predice hoy (pin determinista)
};

function boundaries(text: string): number[] {
  const passages = createPassageDetector().detect(text);
  return passages
    .slice(1)
    .map((p) => p.startLine)
    .sort((a, b) => a - b);
}

function prf(gt: number[], pred: number[]) {
  const gtSet = new Set(gt);
  const predSet = new Set(pred);
  let tp = 0;
  for (const p of predSet) if (gtSet.has(p)) tp++;
  const fp = predSet.size - tp;
  const fn = gtSet.size - tp;
  return {
    tp,
    fp,
    fn,
    precision: predSet.size > 0 ? tp / predSet.size : 1,
    recall: gtSet.size > 0 ? tp / gtSet.size : 1,
  };
}

const fixtures: Fixture[] = [
  {
    name: "separadores ---",
    markers: "---",
    text: [
      "Bloque uno con prosa.",
      "Más texto del primer bloque.",
      "---",
      "Bloque dos con prosa.",
      "Más texto del segundo.",
      "---",
      "Bloque tres con prosa.",
      "Más texto del tercero.",
      "---",
      "Bloque cuatro con prosa.",
      "Más texto del cuarto.",
      "---",
      "Bloque cinco con prosa.",
      "Más texto del quinto.",
    ].join("\n"),
    gt: [2, 5, 8, 11],
    expected: [2, 5, 8, 11],
  },
  {
    name: "separadores *** y ===",
    markers: "*** / ===",
    text: [
      "Bloque a con prosa.",
      "Línea de apoyo del bloque a.",
      "***",
      "Bloque b con prosa.",
      "Línea de apoyo del bloque b.",
      "***",
      "Bloque c con prosa.",
      "Línea de apoyo del bloque c.",
      "===",
      "Bloque d con prosa.",
      "Línea de apoyo del bloque d.",
      "===",
      "Bloque e con prosa.",
      "Línea de apoyo del bloque e.",
      "===",
      "Bloque f con prosa.",
      "Línea de apoyo del bloque f.",
    ].join("\n"),
    gt: [2, 5, 8, 11, 14],
    expected: [2, 5, 8, 11, 14],
  },
  {
    name: "numeración irregular con señuelo de año",
    markers: "1. / 2) / 3  + señuelo",
    text: [
      "1. Primer pasaje numérico con prosa extendida.",
      "Segunda línea del primero.",
      "2) Pasaje con paréntesis y prosa.",
      "Otra línea de continuidad.",
      "3 Tercer pasaje sin punto.",
      "Más contenido aquí.",
      "4. Cuarto pasaje normal.",
      "Contenido del cuarto.",
      "1984 se publicó mucho después de la guerra.",
      "La literatura no para de crecer.",
      "5. Quinto pasaje final.",
      "Cierre del fragmento.",
    ].join("\n"),
    gt: [2, 4, 6, 10],
    expected: [2, 4, 6, 8, 10],
  },
  {
    name: "mezcla sucia: condicional, título, separador, muerte",
    markers: "condicional + título + --- + muerte",
    text: [
      "Entradas de la cueva húmeda.",
      "El aire es frío y denso dentro.",
      "Si tienes la espada, ve al pasaje 7.",
      "Pasillo largo a la izquierda.",
      "EL CAMINO OSCURO",
      "Continúas hacia la galería.",
      "---",
      "Un ruido metálico resuena al fondo.",
      "Pasaje secreto descubierto.",
      "Tu vida llega a su muerte.",
      "Acabas tu travesía por el refugio.",
    ].join("\n"),
    gt: [2, 4, 6, 9],
    expected: [2, 6, 9],
  },
  {
    name: "control: prosa continua sin marcadores",
    markers: "ninguno",
    text: [
      "Te despiertas sin recordar cómo llegaste hasta aquí,",
      "con la cabeza pesada y un frío que se te mete en los huesos.",
      "Delante de ti se alza una muralla cubierta de hiedra",
      "y una puerta de madera entreabierta que cruje con el viento.",
      "",
      "El guardia que custodia el paso te mira con desconfianza",
      "y apoya la lanza contra el suelo mientras decides qué hacer.",
      "A tu izquierda hay un sendero estrecho que baja hacia el río,",
      "y a la derecha una escalera que asciende hasta las almenas.",
    ].join("\n"),
    gt: [],
    expected: [],
  },
];

describe("matriz de efectividad por patrón de marcador", () => {
  for (const f of fixtures) {
    it(`${f.name} [${f.markers}] → P/R exactos`, () => {
      const pred = boundaries(f.text);
      const s = prf(f.gt, pred);
      console.log(
        `[matrix] ${f.name} | GT=${JSON.stringify(f.gt)} pred=${JSON.stringify(pred)} ` +
          `TP=${s.tp} FP=${s.fp} FN=${s.fn} P=${(s.precision * 100).toFixed(1)}% R=${(s.recall * 100).toFixed(1)}%`
      );

      expect(pred).toEqual(f.expected);

      if (f.gt.length === 0) {
        expect(s.fp).toBe(0);
        expect(pred).toEqual([]);
      } else if (f.name.includes("señuelo")) {
        expect(s.tp).toBe(4);
        expect(s.fp).toBe(1);
        expect(s.fn).toBe(0);
        expect(s.precision).toBeCloseTo(0.8, 5);
        expect(s.recall).toBeCloseTo(1, 5);
      } else if (f.name.includes("mezcla")) {
        expect(s.tp).toBe(3);
        expect(s.fp).toBe(0);
        expect(s.fn).toBe(1);
        expect(s.precision).toBeCloseTo(1, 5);
        expect(s.recall).toBeCloseTo(0.75, 5);
      } else {
        expect(s.fp).toBe(0);
        expect(s.fn).toBe(0);
        expect(s.precision).toBeCloseTo(1, 5);
        expect(s.recall).toBeCloseTo(1, 5);
      }
    });
  }

  it("resumen global: micro-precisión y micro-recall ≥ 90%", () => {
    let TP = 0;
    let FP = 0;
    let FN = 0;
    for (const f of fixtures) {
      const s = prf(f.gt, boundaries(f.text));
      TP += s.tp;
      FP += s.fp;
      FN += s.fn;
    }
    const microPrecision = TP / (TP + FP);
    const microRecall = TP / (TP + FN);
    const f1 = (2 * microPrecision * microRecall) / (microPrecision + microRecall);
    console.log(
      `[matrix] GLOBAL TP=${TP} FP=${FP} FN=${FN} ` +
        `P=${(microPrecision * 100).toFixed(1)}% R=${(microRecall * 100).toFixed(1)}% F1=${(f1 * 100).toFixed(1)}%`
    );
    expect(microPrecision).toBeGreaterThanOrEqual(0.9);
    expect(microRecall).toBeGreaterThanOrEqual(0.9);
    expect(f1).toBeGreaterThanOrEqual(0.9);
  });
});
