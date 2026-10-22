import { classifyNumber } from "./reference-classifier";

const DIGIT_RUN = /\b\d+\b/g;

function forEachReference(
  content: string,
  visit: (n: number) => boolean | void
): void {
  for (const match of content.matchAll(DIGIT_RUN)) {
    const raw = match[0];
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < 1) continue;
    if (classifyNumber(content, match.index ?? 0, raw.length) !== "reference") {
      continue;
    }
    if (visit(n) === true) return;
  }
}

/** Números de pasaje referenciados textualmente en `content` (en orden, sin repetir). */
export function findReferenceTargets(content: string): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  forEachReference(content, (n) => {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  });
  return out;
}

/** true si `content` contiene alguna referencia textual a `target`. */
export function referencesTo(content: string, target: number): boolean {
  let found = false;
  forEachReference(content, (n) => {
    if (n === target) {
      found = true;
      return true;
    }
  });
  return found;
}

/** Referencias de `content` a pasajes que no existen en `existing`. */
export function missingReferenceTargets(
  content: string,
  existing: ReadonlySet<number>
): number[] {
  return findReferenceTargets(content).filter((n) => !existing.has(n));
}

/**
 * Elimina las frases que contienen una referencia textual a `target`.
 * Las frases se separan por . ! ? … y conservan la puntuación y los
 * saltos de línea que las rodean; si no hay referencias, devuelve
 * `content` sin cambios.
 */
export function removeSentencesContainingReference(
  content: string,
  target: number
): string {
  const sentences = content.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g);
  if (!sentences) return content;
  return sentences.filter((s) => !referencesTo(s, target)).join("");
}
