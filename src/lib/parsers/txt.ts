import {
  buildKeywordNumberRegex,
  classifyNumber,
} from "@/lib/reference-classifier";

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

  const passageMap = new Map<
    number,
    { startLine: number; lines: string[]; duplicateOf?: number }
  >();
  const passageOrder: number[] = [];
  const warnings: string[] = [];

  // Pattern: number alone on a line (supports decimals "7,5" or "7.5")
  // and number + bracketed marker ("45 [FIN]"), like "1 [INICIO]".
  const passageStartRegex = /^\s*(\d+(?:[.,]\d+)?)\s*(?:\[[^\]]*\])?\s*$/;

  const headers: { num: number; startLine: number }[] = [];
  let globalMaxNumber = 0;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(passageStartRegex);
    if (match) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (isNaN(num)) continue;
      if (!Number.isInteger(num)) {
        warnings.push(
          `Pasaje "${match[1]}" (línea ${i + 1}): número no entero; no se crea como pasaje. Su contenido queda dentro del pasaje anterior.`
        );
        continue;
      }
      headers.push({ num, startLine: i + 1 });
      if (num > globalMaxNumber) globalMaxNumber = num;
    }
  }

  if (headers.length === 0) {
    warnings.push(
      "No se detectaron cabeceras de pasaje (número solo en una línea). Todo el contenido se importó como un único pasaje. Revisa el formato del archivo."
    );
    return {
      passages: [{
        number: 1,
        content: normalizedText.trim(),
        isStart: true,
        isEndpoint: true,
      }],
      links: [],
      warnings,
    };
  }

  const occurrences = new Map<number, number[]>();
  headers.forEach((h, idx) => {
    const list = occurrences.get(h.num);
    if (list) list.push(idx);
    else occurrences.set(h.num, [idx]);
  });

  // Criterio único: se conserva siempre la primera aparición en el documento.
  const keptIdx = new Set<number>();
  const duplicatedNums = new Set<number>();
  for (const [num, idxs] of occurrences) {
    if (idxs.length === 1) continue;
    duplicatedNums.add(num);
    keptIdx.add(idxs[0]);
  }

  const usedNumbers = new Set(headers.map((h) => h.num));
  let renumCounter = globalMaxNumber;
  headers.forEach((h, idx) => {
    if (!duplicatedNums.has(h.num) || keptIdx.has(idx)) {
      passageMap.set(h.num, { startLine: h.startLine, lines: [] });
      passageOrder.push(h.num);
      return;
    }
    do {
      renumCounter++;
    } while (usedNumbers.has(renumCounter));
    usedNumbers.add(renumCounter);
    passageMap.set(renumCounter, {
      startLine: h.startLine,
      lines: [],
      duplicateOf: h.num,
    });
    passageOrder.push(renumCounter);
    warnings.push(
      `Pasaje ${h.num} duplicado (línea ${h.startLine}) → renumerado como ${renumCounter}. Se conserva el primer ${h.num}; las referencias al ${h.num} siguen apuntando a él.`
    );
  });

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

  for (const num of passageOrder) {
    const entry = passageMap.get(num)!;
    const rawLines = entry.lines;

    let endIdx = rawLines.length;
    while (endIdx > 0 && rawLines[endIdx - 1].trim() === "") endIdx--;
    const trimmedLines = rawLines.slice(0, endIdx);
    if (trimmedLines.length === 0) continue;

    const content = stripTrailingStandaloneNumbers(trimmedLines.join("\n").trim());

    // Extract options from the passage
    const options = extractOptionsFromContent(content);

    // Detect endings strictly: last non-empty line is a FIN marker AND no options
    const isEndpoint = options.length === 0 && isStrictEndingMarker(content);

    const isStart = num === 1 || passageOrder.indexOf(num) === 0;

    passages.push({
      number: num,
      ...(entry.duplicateOf !== undefined
        ? { title: `${entry.duplicateOf} (duplicado)` }
        : {}),
      content,
      isStart,
      isEndpoint,
      options,
    });
  }

  // Build links from all passages
  const allNumbers = passages.map(p => p.number);
  const links: { sourceNumber: number; targetNumber: number; text: string }[] = [];

  for (const passage of passages) {
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

  const unlinkedOptionSummary: string[] = [];
  let unlinkedOptionCount = 0;

  for (const passage of passages) {
    if (/\(?\s*Escribe aqu[íi]/i.test(passage.content)) {
      warnings.push(
        `Pasaje ${passage.number}: contenido pendiente (placeholder "Escribe aquí…").`
      );
    }

    const missingTargets = new Set<number>();
    for (const cand of collectReferenceCandidates(passage.content)) {
      if (allNumbers.includes(cand.target) || missingTargets.has(cand.target)) {
        continue;
      }
      missingTargets.add(cand.target);
      warnings.push(
        `Pasaje ${passage.number}: la referencia "${cand.text.trim()}" apunta al ${cand.target}, que no existe en el archivo.`
      );
    }
    for (const opt of passage.options ?? []) {
      if (
        opt.targetNumber !== undefined &&
        !allNumbers.includes(opt.targetNumber) &&
        !missingTargets.has(opt.targetNumber)
      ) {
        missingTargets.add(opt.targetNumber);
        warnings.push(
          `Pasaje ${passage.number}: la opción "${opt.text}" apunta al ${opt.targetNumber}, que no existe en el archivo.`
        );
      }
    }
    const unlinkedOptions = (passage.options ?? []).filter(
      (opt) => opt.targetNumber === undefined && opt.type !== "dice"
    );
    if (unlinkedOptions.length > 0) {
      unlinkedOptionSummary.push(` ${passage.number} (${unlinkedOptions.length})`);
      unlinkedOptionCount += unlinkedOptions.length;
    }
    for (const w of detectThresholdWarnings(passage.number, passage.content)) {
      warnings.push(w);
    }
  }

  if (unlinkedOptionCount > 0) {
    warnings.push(
      `Opciones sin destino: ${unlinkedOptionCount} en ${unlinkedOptionSummary.length} pasaje(s):${unlinkedOptionSummary.join(",")}. Se importan sin enlace.`
    );
  }

  passages.sort((a, b) => a.number - b.number);

  return {
    passages,
    links,
    warnings,
  };
}

function extractOptionsFromContent(content: string): PassageOption[] {
  const options: PassageOption[] = [];
  const lines = content.split("\n");

  const isDialogue = (line: string) => /^[—–]\s+/.test(line);

  // Una opción de verbo suelto solo se acepta si forma parte de un bloque de
  // al menos dos líneas consecutivas: así no confundimos prosa corta con opciones.
  const isVerbCandidate = (line: string, index: number): boolean => {
    if (index < 0 || index >= lines.length) return false;
    const trimmed = line.trim();
    return (
      index >= lines.length - 6 &&
      trimmed.length > 2 &&
      trimmed.length < 60 &&
      !/^\d/.test(trimmed) &&
      !/[.,;:!?…]$/.test(trimmed) &&
      !/^(FIN|Nota|Recuerda|Pierdes|Recupera|Has\s|Te\s|Los\s|Las\s|El\s|La\s|Lo\s|Un\s|Una\s)/i.test(trimmed) &&
      !/^(Depositas|Es\s+hora|Recuerda,\s)/i.test(trimmed) &&
      !MONTH_DATE.test(trimmed) &&
      !/^\d{4}$/.test(trimmed) &&
      /^[A-ZÁÉÍÓÚÑ]/.test(trimmed) &&
      !isDialogue(trimmed)
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || isDialogue(trimmed)) continue;

    // Un FIN, una fecha o un año de cierre no son opciones.
    if (
      /^[\s\-—=*•·]*F[Ii][Nn]\b/.test(trimmed) ||
      MONTH_DATE.test(trimmed) ||
      /^\d{4}$/.test(trimmed)
    ) {
      continue;
    }

    const explicitTarget = findReferenceTarget(trimmed);

    // Flechas reales. El guion suelto se reserva para diálogo o viñetas con destino.
    const isArrowOption = /^(?:→|->|-->|—>)\s+/.test(trimmed);
    const isBulletOption = /^[-*]\s+/.test(trimmed) && explicitTarget !== undefined;

    // Tabulación: línea corta, no continuación de frase y con aspecto de opción.
    const isTabOption =
      line.startsWith("\t") &&
      trimmed.length <= 80 &&
      !/^[a-záéíóúñü]/.test(trimmed) &&
      (explicitTarget !== undefined ||
        (trimmed.length <= 60 && !/[.,;:!?…]$/.test(trimmed)));

    // «Si …» solo cuenta como opción si contiene un destino explícito.
    const isSiOption = /^Si\s+/i.test(trimmed) && explicitTarget !== undefined;

    const isVerbOption =
      isVerbCandidate(line, i) &&
      (isVerbCandidate(lines[i - 1] ?? "", i - 1) ||
        isVerbCandidate(lines[i + 1] ?? "", i + 1));

    if (
      !isArrowOption &&
      !isBulletOption &&
      !isTabOption &&
      !isSiOption &&
      !isVerbOption
    ) {
      continue;
    }

    let optionText = trimmed.replace(/^(?:→|->|-->|—>|[-*])\s+/, "").trim();

    // Skip empty or very short options
    if (optionText.length < 2) continue;

    // Skip "Nota:" lines (annotations)
    if (/^Nota:/i.test(optionText)) continue;

    // Skip lines that look like narrative text (contain commas, long sentences)
    if (optionText.includes(",") && optionText.length > 60) continue;

    // Determine option type
    let type: "link" | "action" | "dice" = "action";
    let targetNumber: number | undefined = explicitTarget;

    if (targetNumber !== undefined) {
      type = "link";
    }

    // Check for dice roll
    if (/tirada|tira\s+el\s+dado|random/i.test(optionText)) {
      type = "dice";
    }

    // Check for Twine goto
    const gotoMatch = optionText.match(/<<goto\s+"([^"]+)">>/i);
    if (gotoMatch) {
      const numMatch = gotoMatch[1].match(/(\d+)/);
      if (numMatch) {
        targetNumber = parseInt(numMatch[1], 10);
        type = "link";
      }
    }

    options.push({
      text: optionText,
      targetNumber,
      type,
    });
  }

  return options;
}

const MONTH_DATE =
  /^(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4}$/i;

/** Líneas que pueden seguir a un FIN sin convertir el final en otra cosa. */
function isTrailingFluff(line: string): boolean {
  const trimmed = line.trim();
  return (
    MONTH_DATE.test(trimmed) ||
    /^\d{4}$/.test(trimmed) ||
    /^©/.test(trimmed) ||
    /^(?:Todos los derechos|Impreso|ISBN|Dep[óo]sito legal|Printed|Copyright)\b/i.test(
      trimmed
    )
  );
}

function isStrictEndingMarker(content: string): boolean {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return false;

  // Miramos las últimas líneas: un FIN puede ir seguido de fecha o créditos.
  const tailStart = Math.max(0, lines.length - 4);
  for (let i = lines.length - 1; i >= tailStart; i--) {
    const m = lines[i].match(/^[\s\-—=*•·]*F[Ii][Nn]\b(.*)$/);
    if (!m) continue;

    const rest = m[1]
      .trim()
      .replace(/^[\s\-—=*•·]+/, "")
      .replace(/[\s\-—=*•·]+$/, "");

    const valid =
      rest === "" ||
      /^[.!…]+$/.test(rest) ||
      /^(?:DEL?\s+)?(?:JUEGO|AVENTURA|LIBRO|VOLUMEN|CAP[IÍ]TULO|ACTO|PARTIDA|HISTORIA)(?:\s+(?:PRIMERO|SEGUNDO|TERCERO|[IVXLC]+|\d+))?\s*[.!…]*$/i.test(
        rest
      ) ||
      /^(?:I{1,3}|IV|V)\s+VOLUMEN\s*[.!…]*$/i.test(rest) ||
      /^DE\s+LA\s+(?:AVENTURA|HISTORIA|PARTIDA|VIDA)\s*[.!…]*$/i.test(rest);

    if (!valid) continue;
    if (lines.slice(i + 1).every(isTrailingFluff)) return true;
  }

  return false;
}

// Remove trailing standalone numbers from passage content (e.g., "846" alone on last line)
function stripTrailingStandaloneNumbers(content: string): string {
  const lines = content.split("\n");
  let endIdx = lines.length;
  while (
    endIdx > 0 &&
    /^\s*\d+(?:[.,]\d+)?\s*(?:\[[^\]]*\])?\s*$/.test(lines[endIdx - 1])
  ) {
    endIdx--;
  }
  return lines.slice(0, endIdx).join("\n").trim();
}

interface ReferenceCandidate {
  offset: number;
  length: number;
  target: number;
  text: string;
  fromGoto?: boolean;
}

function collectReferenceCandidates(content: string): ReferenceCandidate[] {
  const candidates: ReferenceCandidate[] = [];
  const isReference = (index: number, length: number) =>
    classifyNumber(content, index, length) === "reference";

  // TWINE-STYLE GOTO
  const gotoRegex = /<<goto\s+"([^"]+)">>/gi;
  let gotoMatch;
  while ((gotoMatch = gotoRegex.exec(content)) !== null) {
    const numMatch = gotoMatch[1].match(/(\d+(?:[.,]\d+)?)/);
    if (numMatch) {
      const target = parseFloat(numMatch[1].replace(",", "."));
      const offset =
        gotoMatch.index +
        gotoMatch[0].indexOf(gotoMatch[1]) +
        (numMatch.index ?? 0);
      if (!isNaN(target) && isReference(offset, numMatch[1].length)) {
        candidates.push({
          offset,
          length: numMatch[1].length,
          target,
          text: gotoMatch[0],
          fromGoto: true,
        });
      }
    }
  }

  // GOTO sin comillas: <<goto 15>>
  const bareGotoRegex = /<<\s*goto\s+(\d+)\s*>>/gi;
  let bareGotoMatch;
  while ((bareGotoMatch = bareGotoRegex.exec(content)) !== null) {
    const target = parseInt(bareGotoMatch[1], 10);
    const offset =
      bareGotoMatch.index +
      bareGotoMatch[0].indexOf(bareGotoMatch[1]);
    if (isReference(offset, bareGotoMatch[1].length)) {
      candidates.push({
        offset,
        length: bareGotoMatch[1].length,
        target,
        text: bareGotoMatch[0],
        fromGoto: true,
      });
    }
  }

  // Bloques de código Twine: sus números (<<set ... = 2>>) no son referencias.
  // Los <<goto ...>> se conservan porque se han procesado aparte.
  const codeRanges: Array<{ start: number; end: number }> = [];
  const codeRegex = /<<[\s\S]*?>>/g;
  let codeMatch;
  while ((codeMatch = codeRegex.exec(content)) !== null) {
    codeRanges.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
    });
  }

  // ARROW PATTERNS: "→ 25" or "-> 25"
  const arrowRegex = /(?:→|->|-->|—>)\s*(\d+(?:[.,]\d+)?)/g;
  let arrowMatch;
  while ((arrowMatch = arrowRegex.exec(content)) !== null) {
    const target = parseFloat(arrowMatch[1].replace(",", "."));
    const offset = arrowMatch.index + arrowMatch[0].indexOf(arrowMatch[1]);
    if (!isNaN(target) && isReference(offset, arrowMatch[1].length)) {
      candidates.push({
        offset,
        length: arrowMatch[1].length,
        target,
        text: arrowMatch[0].trim(),
      });
    }
  }

  // BRACKET PATTERNS: "[25]", "(25)"
  const bracketRegex = /[\[\{(]\s*(?:pasaje\s+)?(\d+(?:[.,]\d+)?)\s*[\]\})]/gi;
  let bracketMatch;
  while ((bracketMatch = bracketRegex.exec(content)) !== null) {
    const target = parseFloat(bracketMatch[1].replace(",", "."));
    const offset =
      bracketMatch.index + bracketMatch[0].indexOf(bracketMatch[1]);
    if (!isNaN(target) && isReference(offset, bracketMatch[1].length)) {
      candidates.push({
        offset,
        length: bracketMatch[1].length,
        target,
        text: bracketMatch[0],
      });
    }
  }

  // DIRECT PASSAGE REFERENCES: "ve al 25", "pasaje 25", "Turn to 25"
  const directRefRegex = buildKeywordNumberRegex("giu");
  let directRefMatch;
  while ((directRefMatch = directRefRegex.exec(content)) !== null) {
    const target = parseFloat(directRefMatch[1].replace(",", "."));
    const offset =
      directRefMatch.index +
      directRefMatch[0].length -
      directRefMatch[1].length;
    if (!isNaN(target) && isReference(offset, directRefMatch[1].length)) {
      candidates.push({
        offset,
        length: directRefMatch[1].length,
        target,
        text: directRefMatch[0],
      });
    }
  }

  // CLASIFICADOR: números que classifyNumber considera referencia aunque
  // no coincidan con ninguna familia anterior (p. ej. "ve al 3 y 5",
  // <<goto sin comillas> o comillas tipográficas)
  const tokenRegex = /\b\d+(?:[.,]\d+)?\b/g;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(content)) !== null) {
    const token = tokenMatch[0];
    // Los decimales no son pasajes: no deben generar enlaces ni avisos.
    if (/[.,]/.test(token)) continue;
    const offset = tokenMatch.index;
    const length = token.length;
    const covered = candidates.some(
      (c) => offset >= c.offset && offset < c.offset + c.length
    );
    if (covered) continue;
    if (!isReference(offset, length)) continue;
    candidates.push({
      offset,
      length,
      target: Number(token),
      text: token,
    });
  }

  return candidates.filter((candidate) => {
    if (
      !candidate.fromGoto &&
      codeRanges.some(
        (range) =>
          candidate.offset >= range.start && candidate.offset < range.end
      )
    ) {
      return false;
    }
    return Number.isInteger(candidate.target) && candidate.target > 0;
  });
}

function detectInlineLinks(
  content: string,
  allPassageNumbers: number[]
): { targetNumber: number; text: string }[] {
  const seen = new Set<number>();
  const links: { targetNumber: number; text: string }[] = [];
  for (const candidate of collectReferenceCandidates(content)) {
    if (!allPassageNumbers.includes(candidate.target)) continue;
    if (seen.has(candidate.target)) continue;
    seen.add(candidate.target);
    links.push({ targetNumber: candidate.target, text: candidate.text });
  }
  return links;
}

function findReferenceTarget(text: string): number | undefined {
  const candidates = collectReferenceCandidates(text);
  if (candidates.length === 0) {
    const bare = text.trim().match(/^(\d+)$/);
    if (bare) {
      const num = parseInt(bare[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return undefined;
  }
  candidates.sort((a, b) => a.offset - b.offset);
  return candidates[0].target;
}

function detectThresholdWarnings(passageNumber: number, content: string): string[] {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    if (!/\b(resultado|tirada|total)\b/i.test(line)) continue;
    const match =
      /\b(?:mayor|menor|igual|inferior|superior)\b\s+(?:o\s+(?:mayor|menor|igual)\s+)?(?:a|de|que)\s+(\d{3,})\b/i.exec(
        line
      ) ?? /\b(\d{3,})\s+o\s+(?:más|menos)\b/i.exec(line);
    if (match) {
      out.push(
        `Pasaje ${passageNumber}: "${match[0].trim()}" parece un umbral sospechoso (número de 3 o más cifras). Revisa si es correcto.`
      );
    }
  }
  return out;
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
