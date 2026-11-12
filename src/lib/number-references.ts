import { classifyNumber } from "./reference-classifier";

type NumberMapping = Map<number, number> | Record<number, number>;

function toEntries(mapping: NumberMapping): [number, number][] {
  const entries: [number, number][] =
    mapping instanceof Map
      ? [...mapping.entries()]
      : Object.entries(mapping).map(
          ([k, v]) => [Number(k), v] as [number, number]
        );
  return entries
    .filter(([oldNum, newNum]) => Number.isFinite(oldNum) && oldNum !== newNum)
    .sort((a, b) => b[0].toString().length - a[0].toString().length);
}

/**
 * Patrón de un número entero de pasaje que no forme parte de otro número ni de
 * un decimal (`7` no debe coincidir dentro de `17` ni de `7,5`).
 */
function integerPattern(n: number): string {
  const escaped = String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `(?<![\\d.,])${escaped}(?![\\d])(?![.,]\\d)`;
}

export function replaceNumberReferences(
  content: string,
  mapping: NumberMapping
): string {
  const entries = toEntries(mapping);
  if (entries.length === 0) return content;
  const lookup = new Map(entries);
  const alternation = entries.map(([oldNum]) => integerPattern(oldNum)).join("|");
  return content.replace(
    new RegExp(alternation, "g"),
    (match: string, offset: number) => {
      const newNum = lookup.get(Number(match));
      if (newNum === undefined) return match;
      if (classifyNumber(content, offset, match.length) !== "reference") {
        return match;
      }
      return String(newNum);
    }
  );
}

export function forceReplaceNumber(content: string, from: number, to: number): string {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return content;
  return content.replace(new RegExp(integerPattern(from), "g"), String(to));
}
