export interface ParsedPassage {
  number: number;
  title?: string;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
}

export function extractPassagesFromText(text: string): ParsedPassage[] {
  if (!text || text.trim().length === 0) return [];

  const passages: ParsedPassage[] = [];
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Multiple passage detection patterns (ordered by priority)
  const boundaryPatterns: { regex: RegExp; group: number }[] = [
    // "1." or "1)" at start of line
    { regex: /^(\d+)\s*[\.\)]\s*/gm, group: 1 },
    // "Pasaje 1" or "PASAJE 1"
    { regex: /^[Pp][Aa][Ss][Aa][Jj][Ee]\s+(\d+)/gm, group: 1 },
    // "# 1" or "## 1" markdown headers
    { regex: /^#{1,3}\s+(\d+)/gm, group: 1 },
    // "SECTION 1"
    { regex: /^[Ss][Ee][Cc][Tt][Ii][Oo][Nn]\s+(\d+)/gm, group: 1 },
    // "CAPITULO 1" or "Capítulo 1"
    { regex: /^[Cc][Aa][Pp][Ii][Tt][Uu][Ll][Oo]\s+(\d+)/gm, group: 1 },
    // Separators
    { regex: /^\s*---\s*$/gm, group: -1 },
    { regex: /^\s*\*\*\*\s*$/gm, group: -1 },
    { regex: /^\s*===+\s*$/gm, group: -1 },
  ];

  interface Boundary {
    pos: number;
    length: number;
    number: number | null;
    isSeparator: boolean;
  }

  const boundaries: Boundary[] = [];

  for (const { regex, group } of boundaryPatterns) {
    const pattern = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      boundaries.push({
        pos: match.index,
        length: match[0].length,
        number: group > 0 ? parseInt(match[group]) : null,
        isSeparator: group === -1,
      });
    }
  }

  boundaries.sort((a, b) => a.pos - b.pos);

  const cleanBoundaries: Boundary[] = [];
  let lastEnd = 0;
  for (const b of boundaries) {
    if (b.pos >= lastEnd) {
      cleanBoundaries.push(b);
      lastEnd = b.pos + b.length;
    }
  }

  if (cleanBoundaries.length === 0) {
    const paragraphs = normalizedText.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    if (paragraphs.length > 0) {
      paragraphs.forEach((paragraph, index) => {
        const trimmed = paragraph.trim();
        const lines = trimmed.split("\n");
        const firstLine = lines[0].trim();
        const isTitle = firstLine.length < 120 && lines.length > 1 && (
          firstLine === firstLine.toUpperCase() ||
          /^[A-ZÁÉÍÓÚÑ]/.test(firstLine)
        );

        passages.push({
          number: index + 1,
          title: isTitle ? firstLine : undefined,
          content: isTitle ? lines.slice(1).join("\n").trim() : trimmed,
          isStart: index === 0,
          isEndpoint: false,
        });
      });
    } else {
      passages.push({
        number: 1,
        content: normalizedText.trim(),
        isStart: true,
        isEndpoint: true,
      });
    }
    return passages;
  }

  const usedNumbers = new Set<number>();
  let nextNumber = 1;

  for (let i = 0; i < cleanBoundaries.length; i++) {
    const boundary = cleanBoundaries[i];
    const nextBoundary = cleanBoundaries[i + 1];

    const passageStart = boundary.isSeparator
      ? boundary.pos + boundary.length
      : boundary.pos;
    const passageEnd = nextBoundary ? nextBoundary.pos : normalizedText.length;

    const passageText = normalizedText.slice(passageStart, passageEnd).trim();
    if (passageText.length === 0) continue;

    let passageNumber: number;
    if (boundary.number !== null) {
      passageNumber = boundary.number;
      usedNumbers.add(passageNumber);
      if (passageNumber >= nextNumber) nextNumber = passageNumber + 1;
    } else {
      while (usedNumbers.has(nextNumber)) nextNumber++;
      passageNumber = nextNumber;
      usedNumbers.add(passageNumber);
      nextNumber++;
    }

    const lines = passageText.split("\n");
    const firstLine = lines[0].trim();
    const titleMatch = firstLine.match(/^(?:\d+[\.\)]\s*|[Pp]asaje\s+\d+\s*|#{1,3}\s+\d+\s*)(.*)/);
    const title = titleMatch?.[1]?.trim() || undefined;
    const contentStart = title ? 1 : 0;
    const content = lines.slice(contentStart).join("\n").trim();

    const isEndpoint = content.length === 0 ||
      /\b(fin|termina|acaba|muerte|game\s*over|the\s*end)\b/i.test(content);

    passages.push({
      number: passageNumber,
      title,
      content,
      isStart: passageNumber === 1,
      isEndpoint,
    });
  }

  passages.sort((a, b) => a.number - b.number);
  return passages;
}

export function detectLinksInPassage(
  content: string,
  allPassageNumbers: number[]
): { targetNumber: number; text: string }[] {
  const links: { targetNumber: number; text: string }[] = [];

  // Comprehensive patterns for gamebook links (Spanish + English)
  const patterns: RegExp[] = [
    // === SPANISH PATTERNS ===
    // "ve al pasaje 25", "ves al 25", "ir al pasaje 25"
    /(?:ve(?:s|r)?|ir)\s+(?:al?\s+)?(?:pasaje\s+)?(\d+)/gi,
    // "continua en el 25", "continuar al 25"
    /(?:contin[uú](?:a|ar))\s+(?:en\s+(?:el\s+)?|al?\s+)?(?:pasaje\s+)?(\d+)/gi,
    // "pasa al 25", "pasar al 25"
    /(?:pasa(?:r)?)\s+(?:al?\s+)?(?:pasaje\s+)?(\d+)/gi,
    // "acude al 25"
    /(?:acude(?:r)?)\s+(?:al?\s+)?(?:pasaje\s+)?(\d+)/gi,
    // "dirigete al 25", "dirígete al 25"
    /(?:dirig(?:ete|irse))\s+(?:al?\s+)?(?:pasaje\s+)?(\d+)/gi,
    // "si tienes X, ve al 25"
    /(?:si\s+.+?,?\s+)?(?:ve|ir|continuar|pasar)\s+(?:al?\s+)?(\d+)/gi,
    // "ve a la opcion 25"
    /(?:ve|ir)\s+(?:a\s+)?(?:la\s+)?(?:opción|opcion|alternativa)\s+(\d+)/gi,

    // === ENGLISH PATTERNS ===
    // "go to passage 25", "go to 25"
    /(?:go(?:es)?|turn|proceed|move)\s+(?:to\s+)?(?:passage\s+)?(\d+)/gi,
    // "continue to 25", "continue at 25"
    /(?:continue)\s+(?:to|at)\s+(?:passage\s+)?(\d+)/gi,
    // "if X, go to 25"
    /(?:if\s+.+?,?\s+)?(?:go|turn|continue|proceed)\s+(?:to\s+)?(\d+)/gi,

    // === ARROW PATTERNS ===
    // "1 -> 25", "1 → 25", "1 --> 25"
    /(\d+)\s*(?:→|->|-->|—>)\s*(\d+)/g,
    // "-> 25", "→ 25"
    /(?:→|->|-->|—>)\s*(\d+)/g,

    // === BRACKET PATTERNS ===
    // "[25]", "[pasaje 25]"
    /\[(?:pasaje\s+)?(\d+)\]/gi,
    // "{25}"
    /\{(\d+)\}/g,

    // === PARENTHESIS PATTERNS ===
    // "(25)", "(pasaje 25)"
    /\((?:pasaje\s+)?(\d+)\)/gi,

    // === NUMBER AT END OF LINE ===
    // "25" at the end of a line (common in gamebooks)
    /\b(\d+)\s*$/gm,

    // === OPTION PATTERNS ===
    // "opción 25", "alternativa 25"
    /(?:opción|opcion|alternativa|opcao|alternative)\s+(\d+)/gi,
    // "a) 25", "b) 25"
    /[a-z]\)\s*(\d+)/gi,
  ];

  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      // For arrow patterns with two numbers, use the second one
      const targetNumber = match[2] ? parseInt(match[2]) : parseInt(match[1]);
      if (targetNumber > 0 && allPassageNumbers.includes(targetNumber)) {
        links.push({
          targetNumber,
          text: match[0],
        });
      }
    }
  });

  // Remove duplicates (keep first occurrence)
  const seen = new Set<number>();
  const uniqueLinks = links.filter(link => {
    if (seen.has(link.targetNumber)) return false;
    seen.add(link.targetNumber);
    return true;
  });

  return uniqueLinks;
}

export function autoDetectLinks(
  passages: { number: number; content: string }[]
): { sourceNumber: number; targetNumber: number; text: string }[] {
  const allNumbers = passages.map(p => p.number);
  const detectedLinks: { sourceNumber: number; targetNumber: number; text: string }[] = [];

  for (const passage of passages) {
    const links = detectLinksInPassage(passage.content, allNumbers);
    for (const link of links) {
      detectedLinks.push({
        sourceNumber: passage.number,
        targetNumber: link.targetNumber,
        text: link.text,
      });
    }
  }

  return detectedLinks;
}
