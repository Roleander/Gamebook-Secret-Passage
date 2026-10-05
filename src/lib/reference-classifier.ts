export type NumberRole = "reference" | "not-reference" | "ambiguous";

const KEYWORDS = [
  "ve", "ves", "ved", "va", "van", "ir", "pasa", "pasar", "pasad", "pasan",
  "continua", "continúa", "continúan", "acude", "acudid", "retrocede",
  "vuelve", "vuelven", "regresa", "salta", "entra", "entran", "sigue", "sal",
  "pasaje", "pasajes", "apartado", "apartados", "punto", "sección", "seccion",
  "secciones", "párrafo", "parrafo", "párrafos", "parrafos", "destino", "al",
  "go", "goto", "turn", "turns", "continue", "continues", "proceed", "head",
  "jump", "skip", "return", "back", "passage", "passages", "section",
  "sections", "paragraph", "paragraphs",
  "allez", "continuez", "poursuivez", "passez", "retournez", "rendez",
  "tournez", "direction", "paragraphe", "paragraphes",
  "gehe", "geh", "weiter", "blättere", "wende", "abschnitt", "abschnitte",
  "passagen", "zurück",
  "vai", "procedi", "torna", "passaggio", "passaggi", "sezione", "sezioni",
  "paragrafo", "paragrafi",
  "vá", "siga", "volte", "retorne", "passe", "passagem", "passagens",
  "seção", "secao", "seções", "secoes", "parágrafo",
  "idź", "idz", "przejdź", "przejdz", "wejdź", "wejdz", "wróć", "wroc",
  "kontynuuj", "przejście", "przejscie", "sekcja", "akapit", "powróć", "powroc",
  "gå", "fortsätt", "fortsatt", "hoppa", "återvänd", "avsnitt", "stycke",
  "passagen",
  "jdi", "pokračuj", "pokracuj", "vrať", "vrat", "přejdi", "prejdi",
  "pasáž", "pasaz", "oddíl", "oddil", "odstavec", "zpět", "zpet",
  "आगे", "जाओ", "अनुच्छेद", "भाग", "अगला", "पैराग्राफ",
  "パッセージ", "次へ", "節", "セクション", "段落", "戻る", "進む",
];

function escapeLiteral(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const KEYWORD_SOURCE = [...new Set(KEYWORDS)].map(escapeLiteral).join("|");
const CONJUNCTION = "(?:y|e|and|et|und|og|i|a|och)";

export function buildKeywordNumberRegex(flags = "giu"): RegExp {
  return new RegExp(
    `(?:${KEYWORD_SOURCE})(?![\\p{L}])[^0-9]{0,40}(\\d+(?:[.,]\\d+)?)`,
    flags
  );
}

const GOTO_BEFORE = /<<\s*goto\b[^>]*$/iu;
const ARROW_BEFORE = /(?:→|->|-->|—>)\s*$/u;
const BRACKET_BEFORE = /[[({«“"]\s*$/u;
const BRACKET_AFTER = /^[\])}»”"]\s*/u;

const KEYWORD_A = new RegExp(
  `(?:^|[^\\p{L}])(?:${KEYWORD_SOURCE})(?![\\p{L}])[^0-9\\n]{0,40}$`,
  "iu"
);

const KEYWORD_B = new RegExp(
  `(?:^|[^\\p{L}])(?:${KEYWORD_SOURCE})(?![\\p{L}])` +
    `(?:[^0-9\\n]{0,40}\\d{1,4}(?:\\s*,\\s*|\\s+${CONJUNCTION}\\s+))*` +
    `[^0-9\\n]{0,40}\\d{1,4}(?:\\s*,\\s*|\\s+${CONJUNCTION}\\s*)$`,
  "iu"
);

const AFTER_DENY: RegExp[] = [
  /^[.,]\d/u,
  /^\s*(?:%|€|\$|£|¥)/u,
  /^[:/]\d/u,
  /^\s*[-–—]\s*\d/u,
  /^\s+(?:al|a|hasta|through|to|bis|auf)\s+\d/iu,
  /^\s+(?:pv|hp|pm|xp|ps|po|lp|mp|pts?|puntos?|points?|monedas?|oro|plata|piezas?|gold|cm|mm|km|kg|min|mins?|minutes?|seg|segs?|segundos?|seconds?|horas?|hours?|d[ií]as?|days?|vidas?|lives?|turnos?|turns?|rondas?|rounds?|metros?|metres?|meters?|mètres?)\b/iu,
];

const BEFORE_DENY: RegExp[] = [
  /\b\d+\s*(?:[-–—]|(?:al|a|hasta|through|to|bis|auf)\s+)\s*(?:\S+\s+){0,2}$/iu,
  new RegExp(
    "(?:^|\\s)(?:nivel|level|niveau|stufe|livello|n[ií]vel|poziom|p[áa]gina|page|seite|pagina|strana|cap[íi]tulo|chapter|capitolo|chapitre|kapitel|rozdzia[łl])\\s*$",
    "iu"
  ),
];

export function classifyNumber(
  text: string,
  index: number,
  tokenLength: number
): NumberRole {
  const token = text.slice(index, index + tokenLength);
  if (!/^\d+$/.test(token)) return "not-reference";

  const from = Math.max(0, index - 60);
  const before = (from > 0 ? "\u0001" : "") + text.slice(from, index);
  const after = text.slice(index + tokenLength, index + tokenLength + 24);

  for (const pattern of AFTER_DENY) {
    if (pattern.test(after)) return "not-reference";
  }
  for (const pattern of BEFORE_DENY) {
    if (pattern.test(before)) return "not-reference";
  }
  if (GOTO_BEFORE.test(before)) return "reference";
  if (ARROW_BEFORE.test(before)) return "reference";
  if (BRACKET_BEFORE.test(before) && BRACKET_AFTER.test(after)) {
    return "reference";
  }
  if (KEYWORD_A.test(before)) return "reference";
  if (KEYWORD_B.test(before)) return "reference";
  return "ambiguous";
}
