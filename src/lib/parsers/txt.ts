export interface ParsedPassage {
  number: number;
  title?: string;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  options?: PassageOption[];
}

export interface PassageOption {
  text: string;
  targetNumber?: number;
  type: "link" | "action" | "dice";
  isNewPassage?: boolean;
}

export interface ParseResult {
  passages: ParsedPassage[];
  links: { sourceNumber: number; targetNumber: number; text: string }[];
  warnings: string[];
}

export function extractPassagesFromText(text: string): ParseResult {
  if (!text || text.trim().length === 0) {
    return { passages: [], links: [], warnings: [] };
  }

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedText.split("\n");

  const passageMap = new Map<number, { startLine: number; lines: string[] }>();
  const passageOrder: number[] = [];

  // Pattern: number alone on a line (supports decimals "7,5" or "7.5")
  const passageStartRegex = /^\s*(\d+(?:[.,]\d+)?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(passageStartRegex);
    if (match) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        passageMap.set(num, { startLine: i + 1, lines: [] });
        passageOrder.push(num);
      }
    }
  }

  if (passageMap.size === 0) {
    return {
      passages: [{
        number: 1,
        content: normalizedText.trim(),
        isStart: true,
        isEndpoint: true,
      }],
      links: [],
      warnings: [],
    };
  }

  // Fill passage content
  for (let idx = 0; idx < passageOrder.length; idx++) {
    const num = passageOrder[idx];
    const entry = passageMap.get(num)!;
    const nextNum = passageOrder[idx + 1];
    const nextEntry = nextNum !== undefined ? passageMap.get(nextNum) : undefined;
    const endLine = nextEntry ? nextEntry.startLine : lines.length;
    entry.lines = lines.slice(entry.startLine, endLine);
  }

  const passages: ParsedPassage[] = [];
  const warnings: string[] = [];

  for (const num of passageOrder) {
    const entry = passageMap.get(num)!;
    const rawLines = entry.lines;

    let endIdx = rawLines.length;
    while (endIdx > 0 && rawLines[endIdx - 1].trim() === "") endIdx--;
    const trimmedLines = rawLines.slice(0, endIdx);
    if (trimmedLines.length === 0) continue;

    const content = trimmedLines.join("\n").trim();

    // Detect endings (FIN, FIN I VOLUMEN, etc.)
    const isEndpoint = /\b[Ff][Ii][Nn]\b/.test(content);

    const isStart = num === 1 || passageOrder.indexOf(num) === 0;

    // Extract options from the passage
    const options = extractOptionsFromContent(content);

    passages.push({
      number: num,
      content,
      isStart,
      isEndpoint,
      options,
    });
  }

  // === AUTO-CREATE PASSAGES FOR UNNUMBERED OPTIONS ===
  const expanded = createPassagesFromUnnumberedOptions(passages);

  // Build links from all passages
  const allNumbers = expanded.passages.map(p => p.number);
  const links: { sourceNumber: number; targetNumber: number; text: string }[] = [];

  for (const passage of expanded.passages) {
    // Links from options with explicit targets
    if (passage.options) {
      for (const opt of passage.options) {
        if (opt.targetNumber && allNumbers.includes(opt.targetNumber)) {
          links.push({
            sourceNumber: passage.number,
            targetNumber: opt.targetNumber,
            text: opt.text,
          });
        }
      }
    }

    // Links from inline references in content
    const inlineLinks = detectInlineLinks(passage.content, allNumbers);
    for (const link of inlineLinks) {
      const alreadyLinked = links.some(
        l => l.sourceNumber === passage.number && l.targetNumber === link.targetNumber
      );
      if (!alreadyLinked) {
        links.push({
          sourceNumber: passage.number,
          targetNumber: link.targetNumber,
          text: link.text,
        });
      }
    }
  }

  expanded.passages.sort((a, b) => a.number - b.number);

  return {
    passages: expanded.passages,
    links,
    warnings,
  };
}

function createPassagesFromUnnumberedOptions(passages: ParsedPassage[]): { passages: ParsedPassage[]; newPassagesCount: number } {
  const allPassages = [...passages];
  const existingNumbers = new Set(passages.map(p => p.number));
  let nextNumber = Math.max(...Array.from(existingNumbers), 0) + 1;
  let newCount = 0;

  // Named references that map to existing passages
  const namedTargets: { pattern: RegExp; findPassage: (passages: ParsedPassage[]) => ParsedPassage | undefined }[] = [
    { pattern: /Continuar\s+abajo/i, findPassage: (ps) => ps.find(p => p.number === 14.5 || (p.number > 14 && !ps.some(q => q.number === p.number && q.number < p.number))) },
    { pattern: /^Continuar$/i, findPassage: () => undefined }, // Will be resolved to next passage
    { pattern: /Proseguir\s+aventura/i, findPassage: () => undefined }, // Will be resolved to next passage
    { pattern: /Continuar\s+epopeya/i, findPassage: () => undefined }, // Will be resolved to next passage
    { pattern: /Desde\s+la\s+muerte/i, findPassage: (ps) => ps.find(p => p.number === 21) },
    { pattern: /Hacia\s+"?Raízcrecida"?/i, findPassage: (ps) => ps.find(p => p.number === 12) },
  ];

  for (const passage of passages) {
    if (!passage.options || passage.options.length === 0) continue;
    if (passage.isEndpoint) continue;

    const passageIdx = allPassages.indexOf(passage);
    const nextPassage = passageIdx >= 0 && passageIdx < allPassages.length - 1
      ? allPassages[passageIdx + 1]
      : null;

    const unnumberedOptions = passage.options.filter(
      opt => !opt.targetNumber && opt.type !== "dice"
    );

    if (unnumberedOptions.length === 0) continue;

    for (const option of unnumberedOptions) {
      // Check for named references first
      let resolved = false;
      for (const named of namedTargets) {
        if (named.pattern.test(option.text)) {
          const target = named.findPassage(allPassages);
          if (target) {
            option.targetNumber = target.number;
            option.type = "link";
            resolved = true;
            break;
          }
        }
      }

      // "Continuar" variants → link to next passage
      if (!resolved && /^Continuar|Proseguir|Seguir$/i.test(option.text.trim())) {
        if (nextPassage) {
          option.targetNumber = nextPassage.number;
          option.type = "link";
          resolved = true;
        }
      }

      if (resolved) continue;

      // Truly unnumbered option → create new passage
      const newNumber = nextNumber++;
      option.targetNumber = newNumber;
      option.isNewPassage = true;

      const newPassage: ParsedPassage = {
        number: newNumber,
        title: option.text,
        content: `[Continúa desde pasaje ${passage.number}]\n\nOpción: ${option.text}\n\n(Escribe aquí el contenido de este pasaje)`,
        isStart: false,
        isEndpoint: false,
        options: [],
      };

      allPassages.push(newPassage);
      newCount++;
    }

    // Update passage content to reference resolved passage numbers
    const contentLines = passage.content.split("\n");
    for (let i = 0; i < contentLines.length; i++) {
      const trimmed = contentLines[i].trim();
      for (const option of unnumberedOptions) {
        if (option.targetNumber && trimmed === option.text) {
          contentLines[i] = contentLines[i].replace(option.text, `${option.text} [→ ${option.targetNumber}]`);
          break;
        }
      }
    }
    passage.content = contentLines.join("\n");
  }

  return { passages: allPassages, newPassagesCount: newCount };
}

function extractOptionsFromContent(content: string): PassageOption[] {
  const options: PassageOption[] = [];
  const lines = content.split("\n");

  // Find where options start (usually after "Decide:", "Elige:", etc.)
  let optionsStartIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (/^(Decide|Elige|Opci[oó]n|Choose|Decision)/i.test(trimmed)) {
      optionsStartIdx = i + 1;
      break;
    }
  }

  // Scan lines for options
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Tab-indented option (gamebook standard)
    const isTabOption = line.startsWith("\t") && trimmed.length > 0;

    // Arrow/bullet option
    const isArrowOption = /^[→\-*>]\s+/.test(trimmed);

    // "Si" conditional option
    const isSiOption = /^Si\s+/i.test(trimmed);

    // Short verb-only option at end of passage (e.g., "Interrogar", "Lanzar un Misil Mágico")
    // These are typically the last few lines, short, start with a verb, and are decision points
    const isVerbOption = i >= lines.length - 6 &&
      trimmed.length > 2 &&
      trimmed.length < 60 &&
      !/^\d/.test(trimmed) &&
      !/\.\s*$/.test(trimmed) && // No period at end
      !/:$/.test(trimmed) && // No colon at end (narrative lead-in)
      !/^(FIN|Nota|Recuerda|Pierdes|Recupera|Has\s|Te\s|Los\s|Las\s|El\s|La\s|Lo\s|Un\s|Una\s)/i.test(trimmed) &&
      !/^(Depositas|Es\s+hora|Recuerda,\s)/i.test(trimmed) && // Narrative phrases
      /^[A-ZÁÉÍÓÚÑ]/.test(trimmed); // Starts with capital letter

    if (isTabOption || isArrowOption || isSiOption || isVerbOption) {
      let optionText = trimmed;

      // Clean up the option text
      optionText = optionText.replace(/^[→\-*>]\s+/, "").trim();

      // Skip empty or very short options
      if (optionText.length < 2) continue;

      // Skip "Nota:" lines (annotations)
      if (/^Nota:/i.test(optionText)) continue;

      // Skip lines that look like narrative text (contain commas, long sentences)
      if (optionText.includes(",") && optionText.length > 60) continue;

      // Determine option type
      let type: "link" | "action" | "dice" = "action";
      let targetNumber: number | undefined;

      // Check for explicit passage number reference
      const numRef = optionText.match(/(\d+(?:[.,]\d+)?)/);
      if (numRef) {
        const num = parseFloat(numRef[1].replace(",", "."));
        if (!isNaN(num) && num > 0) {
          targetNumber = num;
          type = "link";
        }
      }

      // Check for named passage references
      if (!targetNumber) {
        const namedRef = detectNamedReference(optionText);
        if (namedRef) {
          targetNumber = namedRef;
          type = "link";
        }
      }

      // Check for dice roll
      if (/tirada|tira\s+el\s+dado|random/i.test(optionText)) {
        type = "dice";
      }

      // Check for Twine goto
      const gotoMatch = optionText.match(/<<goto\s+"([^"]+)">>/i);
      if (gotoMatch) {
        const numMatch = gotoMatch[1].match(/(\d+(?:[.,]\d+)?)/);
        if (numMatch) {
          targetNumber = parseFloat(numMatch[1].replace(",", "."));
          type = "link";
        }
      }

      options.push({
        text: optionText,
        targetNumber,
        type,
      });
    }
  }

  return options;
}

function detectNamedReference(text: string): number | undefined {
  const namedRefs: { pattern: RegExp; target: number }[] = [
    { pattern: /Hacia\s+"?Raízcrecida"?/i, target: 12 },
    { pattern: /Desde\s+la\s+muerte/i, target: 21 },
  ];

  for (const ref of namedRefs) {
    if (ref.pattern.test(text)) {
      return ref.target;
    }
  }

  return undefined;
}

function detectInlineLinks(
  content: string,
  allPassageNumbers: number[]
): { targetNumber: number; text: string }[] {
  const links: { targetNumber: number; text: string }[] = [];

  // TWINE-STYLE GOTO
  const gotoRegex = /<<goto\s+"([^"]+)">>/gi;
  let gotoMatch;
  while ((gotoMatch = gotoRegex.exec(content)) !== null) {
    const numMatch = gotoMatch[1].match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      const target = parseFloat(numMatch[1].replace(",", "."));
      if (!isNaN(target) && allPassageNumbers.includes(target)) {
        links.push({ targetNumber: target, text: gotoMatch[0] });
      }
    }
  }

  // ARROW PATTERNS: "→ 25" or "-> 25"
  const arrowRegex = /(?:→|->|-->|—>)\s*(\d+(?:[.,]\d+)?)/g;
  let arrowMatch;
  while ((arrowMatch = arrowRegex.exec(content)) !== null) {
    const target = parseFloat(arrowMatch[1].replace(",", "."));
    if (!isNaN(target) && allPassageNumbers.includes(target)) {
      links.push({ targetNumber: target, text: arrowMatch[0].trim() });
    }
  }

  // BRACKET PATTERNS: "[25]", "(25)"
  const bracketRegex = /[\[\{(]\s*(?:pasaje\s+)?(\d+(?:[.,]\d+)?)\s*[\]\})]/gi;
  let bracketMatch;
  while ((bracketMatch = bracketRegex.exec(content)) !== null) {
    const target = parseFloat(bracketMatch[1].replace(",", "."));
    if (!isNaN(target) && allPassageNumbers.includes(target)) {
      links.push({ targetNumber: target, text: bracketMatch[0] });
    }
  }

  // DIRECT PASSAGE REFERENCES: "ve al 25", "pasaje 25"
  const directRefRegex = /(?:ve(?:s|r)?|ir|continuar|pasar|acudir|dirigir(?:te|se)?)\s+(?:al?\s+)?(?:pasaje|apartado|punto|sección|seccion|párrafo)?\s*(\d+(?:[.,]\d+)?)/gi;
  let directRefMatch;
  while ((directRefMatch = directRefRegex.exec(content)) !== null) {
    const target = parseFloat(directRefMatch[1].replace(",", "."));
    if (!isNaN(target) && allPassageNumbers.includes(target)) {
      links.push({ targetNumber: target, text: directRefMatch[0] });
    }
  }

  // Remove duplicates
  const seen = new Set<number>();
  return links.filter(link => {
    if (seen.has(link.targetNumber)) return false;
    seen.add(link.targetNumber);
    return true;
  });
}

// Keep backward-compatible function signature
export function detectLinksInPassage(
  content: string,
  allPassageNumbers: number[]
): { targetNumber: number; text: string }[] {
  return detectInlineLinks(content, allPassageNumbers);
}

export function autoDetectLinks(
  passages: { number: number; content: string }[]
): { sourceNumber: number; targetNumber: number; text: string }[] {
  const allNumbers = passages.map(p => p.number);
  const detectedLinks: { sourceNumber: number; targetNumber: number; text: string }[] = [];

  for (const passage of passages) {
    const links = detectInlineLinks(passage.content, allNumbers);
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
