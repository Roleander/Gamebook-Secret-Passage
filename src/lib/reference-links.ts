import { classifyNumber } from "./reference-classifier";

export interface PassageLink {
  start: number;
  end: number;
  target: number;
  text: string;
}

export function findPassageLinks(
  content: string,
  passageNumbers: ReadonlySet<number>,
  excludeNumber?: number,
  forcedTargets?: ReadonlySet<number>
): PassageLink[] {
  const links: PassageLink[] = [];
  const regex = /\b\d+(?:[.,]\d+)?\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const token = match[0];
    if (/[.,]/.test(token)) continue;
    const target = parseInt(token, 10);
    if (!passageNumbers.has(target)) continue;
    if (excludeNumber !== undefined && target === excludeNumber) continue;
    const role = classifyNumber(content, match.index, token.length);
    if (role === "not-reference") continue;
    if (role === "ambiguous" && !(forcedTargets?.has(target) ?? false)) continue;
    links.push({
      start: match.index,
      end: match.index + token.length,
      target,
      text: token,
    });
  }
  return links;
}

/**
 * Detección sobre el contenido completo devuelta línea a línea: los enlaces
 * que cruzan saltos de línea se recortan al tramo que toca cada línea.
 */
export function findPassageLinksPerLine(
  content: string,
  passageNumbers: ReadonlySet<number>,
  excludeNumber?: number,
  forcedTargets?: ReadonlySet<number>
): PassageLink[][] {
  const links = findPassageLinks(
    content,
    passageNumbers,
    excludeNumber,
    forcedTargets
  );
  const lines = content.split("\n");
  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }
  return lines.map((line, i) => {
    const lineStart = offsets[i];
    const lineEnd = lineStart + line.length;
    const out: PassageLink[] = [];
    for (const link of links) {
      if (link.end <= lineStart || link.start >= lineEnd) continue;
      const start = Math.max(link.start, lineStart) - lineStart;
      const end = Math.min(link.end, lineEnd) - lineStart;
      out.push({ ...link, start, end, text: line.slice(start, end) });
    }
    return out;
  });
}
