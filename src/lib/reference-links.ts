import { classifyNumber } from "./reference-classifier";

export interface PassageLink {
  start: number;
  end: number;
  target: number;
  text: string;
}

export interface OutgoingLinkRef {
  targetId?: string | null;
  target: { number: number };
}

/**
 * Un enlace solo puede viajar dentro de un documento si su destino forma
 * parte de ese mismo documento. `passageIds` es el conjunto de pasajes que se
 * está exportando (un proyecto o, en el futuro, un conjunto completo), así
 * que la comprobación por id no rompe los enlaces entre proyectos cuando
 * ambos acaban en el mismo archivo.
 */
export function isLinkInsideDocument(
  link: OutgoingLinkRef,
  passageIds?: ReadonlySet<string>,
  currentNumber?: number
): boolean {
  const target = link.target?.number;
  if (!Number.isFinite(target)) return false;
  if (currentNumber !== undefined && target === currentNumber) return false;
  if (passageIds && link.targetId && !passageIds.has(link.targetId)) return false;
  return true;
}

/**
 * Enlaces de la caja «Opciones» listos para exportar: sin destinos ajenos al
 * documento, sin autollenlaces y sin duplicados de número.
 */
export function exportableLinks<T extends OutgoingLinkRef>(
  links: readonly T[],
  passageIds?: ReadonlySet<string>,
  currentNumber?: number
): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const link of links) {
    if (!isLinkInsideDocument(link, passageIds, currentNumber)) continue;
    const target = link.target.number;
    if (seen.has(target)) continue;
    seen.add(target);
    out.push(link);
  }
  return out;
}

export function exportableTargets(
  links: readonly OutgoingLinkRef[],
  passageIds?: ReadonlySet<string>,
  currentNumber?: number
): Set<number> {
  return new Set(
    exportableLinks(links, passageIds, currentNumber).map((l) => l.target.number)
  );
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
