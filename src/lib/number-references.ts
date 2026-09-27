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

export function replaceNumberReferences(
  content: string,
  mapping: NumberMapping
): string {
  const entries = toEntries(mapping);
  if (entries.length === 0) return content;
  const lookup = new Map(entries);
  const alternation = entries.map(([oldNum]) => `\\b${oldNum}\\b`).join("|");
  return content.replace(new RegExp(alternation, "g"), (match) => {
    const newNum = lookup.get(Number(match));
    return newNum === undefined ? match : String(newNum);
  });
}
