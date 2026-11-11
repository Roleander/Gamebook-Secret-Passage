/**
 * Chrome escribe los enlaces internos del PDF como `/Dest /passageN` y guarda
 * esos destinos en el diccionario heredado `/Dests` del catálogo. Muchos
 * lectores modernos (y algunos móviles) solo consultan el árbol de nombres
 * `/Names /Dests`, así que añadimos ese árbol mediante una actualización
 * incremental: el PDF original no se toca y, si cualquier cosa no encaja, se
 * devuelve intacto.
 */

const WHITESPACE = new Set([" ", "\n", "\r", "\t", "\f", "\0"]);
const TOKEN_END = new Set(["/", "<", ">", "[", "]", "(", ")"]);

function skipWs(text: string, index: number): number {
  let i = index;
  while (i < text.length && WHITESPACE.has(text[i])) i++;
  return i;
}

/** Devuelve el diccionario `<< ... >>` que empieza en `start`, con llaves anidadas. */
function balancedDict(text: string, start: number): { text: string; end: number } | null {
  if (!text.startsWith("<<", start)) return null;
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") {
      i += 1;
      let level = 1;
      while (i < text.length && level > 0) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === "(") level += 1;
        else if (text[i] === ")") level -= 1;
        i += 1;
      }
      continue;
    }
    if (ch === "<" && text[i + 1] === "<") {
      depth += 1;
      i += 2;
      continue;
    }
    if (ch === ">" && text[i + 1] === ">") {
      depth -= 1;
      i += 2;
      if (depth === 0) return { text: text.slice(start, i), end: i };
      continue;
    }
    i += 1;
  }
  return null;
}

/** Avanza hasta el final del valor PDF que empieza en `start` (dict, array o token). */
function valueEnd(text: string, start: number): number {
  let i = skipWs(text, start);
  if (text.startsWith("<<", i)) {
    const dict = balancedDict(text, i);
    return dict ? dict.end : text.length;
  }
  if (text[i] === "[") {
    let depth = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "(") {
        i += 1;
        let level = 1;
        while (i < text.length && level > 0) {
          if (text[i] === "\\") {
            i += 2;
            continue;
          }
          if (text[i] === "(") level += 1;
          else if (text[i] === ")") level -= 1;
          i += 1;
        }
        continue;
      }
      if (ch === "[") depth += 1;
      else if (ch === "]") {
        depth -= 1;
        i += 1;
        if (depth === 0) return i;
        continue;
      }
      i += 1;
    }
    return i;
  }
  const tokenStart = i;
  while (i < text.length && !WHITESPACE.has(text[i]) && !TOKEN_END.has(text[i])) i++;
  // Una referencia indirecta (`12 0 R`) son tres tokens, no uno.
  if (/^\d+$/.test(text.slice(tokenStart, i))) {
    let j = skipWs(text, i);
    const gen = /^\d+/.exec(text.slice(j));
    if (gen) {
      j += gen[0].length;
      const rAt = skipWs(text, j);
      if (text[rAt] === "R") {
        const after = rAt + 1;
        if (after >= text.length || WHITESPACE.has(text[after]) || TOKEN_END.has(text[after])) {
          return after;
        }
      }
    }
  }
  return i;
}

interface DictEntry {
  key: string;
  value: string;
}

/** Pares clave/valor de primer nivel de un diccionario PDF. */
function dictEntries(dict: string): DictEntry[] {
  const entries: DictEntry[] = [];
  const end = dict.length - 2;
  let i = 2;
  while (i < end) {
    i = skipWs(dict, i);
    if (dict[i] !== "/") {
      i += 1;
      continue;
    }
    const keyStart = i + 1;
    i = keyStart;
    while (i < end && !WHITESPACE.has(dict[i]) && !TOKEN_END.has(dict[i])) i++;
    const key = dict.slice(keyStart, i);
    const valueStart = skipWs(dict, i);
    const stop = valueEnd(dict, i);
    if (stop <= valueStart) {
      i += 1;
      continue;
    }
    entries.push({ key, value: dict.slice(valueStart, stop) });
    i = stop;
  }
  return entries;
}

function escapeString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "\\r");
}

/** Localiza la última aparición de `N 0 obj` y el inicio de su diccionario. */
function findObjectDict(text: string, num: number, gen = 0): string | null {
  const regex = new RegExp(`(?:^|[\\r\\n])${num}\\s+${gen}\\s+obj\\b`, "g");
  let match: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((match = regex.exec(text)) !== null) last = match;
  if (!last) return null;
  const dictStart = text.indexOf("<<", last.index + last[0].length);
  if (dictStart < 0) return null;
  return balancedDict(text, dictStart)?.text ?? null;
}

function readIncrementalTrailer(text: string): { xref: number; dict: string } | null {
  const marker = text.lastIndexOf("startxref");
  if (marker < 0) return null;
  const match = /^startxref\s+(\d+)/.exec(text.slice(marker));
  if (!match) return null;
  const xref = parseInt(match[1], 10);
  if (!Number.isFinite(xref) || xref < 0 || xref >= text.length) return null;
  if (text.slice(xref, xref + 4) !== "xref") return null;
  const trailerAt = text.indexOf("trailer", xref);
  if (trailerAt < 0) return null;
  const dictAt = text.indexOf("<<", trailerAt);
  if (dictAt < 0) return null;
  const dict = balancedDict(text, dictAt);
  return dict ? { xref, dict: dict.text } : null;
}

function refValue(dict: string, key: string): string | null {
  const entry = dictEntries(dict).find((e) => e.key === key);
  return entry ? entry.value : null;
}

function parseRef(value: string | null): { num: number; gen: number } | null {
  if (!value) return null;
  const match = /(\d+)\s+(\d+)\s+R/.exec(value);
  if (!match) return null;
  return { num: parseInt(match[1], 10), gen: parseInt(match[2], 10) };
}

function pad10(value: number): string {
  return String(value).padStart(10, "0");
}

export function addModernNameTree(pdf: Buffer): Buffer {
  try {
    return addModernNameTreeUnsafe(pdf);
  } catch {
    return pdf;
  }
}

function addModernNameTreeUnsafe(pdf: Buffer): Buffer {
  const text = pdf.toString("latin1");
  const trailer = readIncrementalTrailer(text);
  if (!trailer) return pdf;

  const root = parseRef(refValue(trailer.dict, "Root"));
  if (!root) return pdf;

  // Un PDF cifrado no se puede ampliar sin re-cifrar los objetos nuevos.
  if (refValue(trailer.dict, "Encrypt")) return pdf;

  const sizeEntry = refValue(trailer.dict, "Size");
  const size = sizeEntry ? parseInt(sizeEntry, 10) : NaN;
  if (!Number.isFinite(size) || size <= 0) return pdf;

  const catalog = findObjectDict(text, root.num, root.gen);
  if (!catalog || !catalog.includes("/Type") || !catalog.includes("/Catalog")) return pdf;
  if (dictEntries(catalog).some((e) => e.key === "Names")) return pdf;

  const destsValue = refValue(catalog, "Dests");
  if (!destsValue) return pdf;

  let dests: string | null;
  const inlineDict = skipWs(destsValue, 0);
  if (destsValue.startsWith("<<", inlineDict)) {
    dests = balancedDict(destsValue, inlineDict)?.text ?? null;
  } else {
    const destsRef = parseRef(destsValue);
    dests = destsRef ? findObjectDict(text, destsRef.num, destsRef.gen) : null;
  }
  if (!dests) return pdf;

  const destinations = new Map<string, string>();
  for (const entry of dictEntries(dests)) {
    if (!/^passage\d+$/.test(entry.key)) continue;
    destinations.set(entry.key, entry.value);
  }
  if (destinations.size === 0) return pdf;

  const ordered = [...destinations.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const namesArray = ordered
    .map(([key, value]) => `(${escapeString(key)}) ${value}`)
    .join(" ");

  // Los números nuevos deben estar libres; /Size apunta al primero disponible.
  if (findObjectDict(text, size) !== null || findObjectDict(text, size + 1) !== null) return pdf;

  const head = catalog.slice(0, -2);
  const separator = /[\s]$/.test(head) ? "" : " ";
  const newCatalog = `${head}${separator}/Names << /Dests ${size} 0 R >>${catalog.slice(-2)}`;
  const info = refValue(trailer.dict, "Info");
  const id = refValue(trailer.dict, "ID");

  const chunks: string[] = [];
  chunks.push(text.endsWith("\n") || text.endsWith("\r") ? text : `${text}\n`);
  const namesOffset = chunks.join("").length;
  chunks.push(`${size} 0 obj\n<</Names [${namesArray}]>>\nendobj\n`);
  const catalogOffset = chunks.join("").length;
  chunks.push(`${size + 1} 0 obj\n${newCatalog}\nendobj\n`);
  const xrefOffset = chunks.join("").length;

  const entry = (offset: number) => `${pad10(offset)} 00000 n \n`;
  const trailerExtra = [
    `/Size ${size + 2}`,
    `/Root ${size + 1} 0 R`,
    `/Prev ${trailer.xref}`,
    info ? `/Info ${info}` : "",
    id ? `/ID ${id}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  chunks.push(
    `xref\n${size} 2\n${entry(namesOffset)}${entry(catalogOffset)}` +
      `trailer\n<< ${trailerExtra} >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const out = Buffer.from(chunks.join(""), "latin1");
  return out;
}

/**
 * Comprueba si el PDF ya declara el árbol de nombres de destinos moderno.
 * Se usa en pruebas y diagnóstico.
 */
export function hasModernNameTree(pdf: Buffer): boolean {
  const text = pdf.toString("latin1");
  return /\/Names\s*<</.test(text) || /\/Names\s+\d+\s+\d+\s+R/.test(text);
}
