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
