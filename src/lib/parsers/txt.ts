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
    // "1." or "1)" at start of line (standalone or with text after)
    { regex: /^(\d+)\s*[\.\)]\s*/gm, group: 1 },
    // "Pasaje 1" or "PASAJE 1"
    { regex: /^[Pp][Aa][Ss][Aa][Jj][Ee]\s+(\d+)/gm, group: 1 },
    // "# 1" or "## 1" markdown headers with number
    { regex: /^#{1,3}\s+(\d+)/gm, group: 1 },
    // "SECTION 1" or "Section 1"
    { regex: /^[Ss][Ee][Cc][Tt][Ii][Oo][Nn]\s+(\d+)/gm, group: 1 },
    // "CAPITULO 1" or "Capítulo 1"
    { regex: /^[Cc][Aa][Pp][Ii][Tt][Uu][Ll][Oo]\s+(\d+)/gm, group: 1 },
    // "---" separator (treat as unnumbered boundary)
    { regex: /^\s*---\s*$/gm, group: -1 },
    // "***" separator
    { regex: /^\s*\*\*\*\s*$/gm, group: -1 },
    // "===" separator
    { regex: /^\s*===+\s*$/gm, group: -1 },
  ];

  // Find all boundaries with their positions
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

  // Sort by position
  boundaries.sort((a, b) => a.pos - b.pos);

  // Remove overlapping boundaries (keep earliest)
  const cleanBoundaries: Boundary[] = [];
  let lastEnd = 0;
  for (const b of boundaries) {
    if (b.pos >= lastEnd) {
      cleanBoundaries.push(b);
      lastEnd = b.pos + b.length;
    }
  }

  if (cleanBoundaries.length === 0) {
    // No boundaries found - try to split by double newlines as paragraphs
    const paragraphs = normalizedText.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    if (paragraphs.length > 0) {
      paragraphs.forEach((paragraph, index) => {
        const trimmed = paragraph.trim();
        // Check if first line is a title (short, uppercase, etc.)
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
      // Single block of text
      passages.push({
        number: 1,
        content: normalizedText.trim(),
        isStart: true,
        isEndpoint: true,
      });
    }
    return passages;
  }

  // Extract passages from boundaries
  // Track used numbers to assign missing ones
  const usedNumbers = new Set<number>();
  let nextNumber = 1;

  for (let i = 0; i < cleanBoundaries.length; i++) {
    const boundary = cleanBoundaries[i];
    const nextBoundary = cleanBoundaries[i + 1];

    // Extract text for this passage
    const passageStart = boundary.isSeparator
      ? boundary.pos + boundary.length
      : boundary.pos;
    const passageEnd = nextBoundary
      ? nextBoundary.pos
      : normalizedText.length;

    const passageText = normalizedText.slice(passageStart, passageEnd).trim();

    if (passageText.length === 0) continue;

    // Determine passage number
    let passageNumber: number;
    if (boundary.number !== null) {
      passageNumber = boundary.number;
      usedNumbers.add(passageNumber);
      // Update nextNumber to be higher than any explicit number
      if (passageNumber >= nextNumber) {
        nextNumber = passageNumber + 1;
      }
    } else {
      // Separator without number - assign next available number
      while (usedNumbers.has(nextNumber)) {
        nextNumber++;
      }
      passageNumber = nextNumber;
      usedNumbers.add(passageNumber);
      nextNumber++;
    }

    // Extract title from first line
    const lines = passageText.split("\n");
    const firstLine = lines[0].trim();
    const titleMatch = firstLine.match(/^(?:\d+[\.\)]\s*|[Pp]asaje\s+\d+\s*|#{1,3}\s+\d+\s*)(.*)/);
    const title = titleMatch?.[1]?.trim() || undefined;

    // Content is everything after the first line (if title was extracted)
    const contentStart = title ? 1 : 0;
    const content = lines.slice(contentStart).join("\n").trim();

    // Detect if this is an endpoint
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

  // Sort by number
  passages.sort((a, b) => a.number - b.number);

  return passages;
}

export function detectLinksInPassage(
  content: string,
  allPassageNumbers: number[]
): { targetNumber: number; text: string }[] {
  const links: { targetNumber: number; text: string }[] = [];

  // Common patterns for gamebook links (Spanish + English)
  const patterns: RegExp[] = [
    // Spanish
    /(?:ve[rs]?|ir?\s+a|contin[uú]a?\s+(?:en|al?)?|pasa(?:r)?\s+(?:a|al?)?|segue(?:ix|isce)?\s+(?:a|en|al?)?|acude(?:is)?\s+(?:a|al?)?)\s+(?:el\s+)?(?:pasaje\s+)?(\d+)/gi,
    /(?:si\s+.+?,?\s+)?(?:ve|ir|continuar|pasar|acudir)\s+(?:al?\s+)?(\d+)/gi,
    // English
    /(?:go(?:es)?|continue|turn|proceed|move)\s+(?:to\s+)?(?:passage\s+)?(\d+)/gi,
    /(?:if\s+.+?,?\s+)?(?:go|turn|continue|proceed)\s+(?:to\s+)?(\d+)/gi,
    // Arrow patterns
    /(\d+)\s*(?:→|->|—>)\s*(\d+)/g,
    // Bracket patterns
    /\[(\d+)\]/g,
    // Parenthesis patterns (only for numbers > 0)
    /\((\d+)\)/g,
    // "number number" pattern at end of line
    /\b(\d+)\s*$/gm,
  ];

  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const targetNumber = parseInt(match[1]);
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
