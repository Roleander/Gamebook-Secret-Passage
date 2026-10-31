export type PassageSearchable = {
  id: string;
  number: number;
  title?: string | null;
  content?: string | null;
  outgoingLinks?: unknown[];
};

export type PassageSearchResult = {
  passage: PassageSearchable;
  score: number;
  snippet: string;
  matches: string[];
};

const combiningMarkPattern = /[\u0300-\u036f]/g;

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(combiningMarkPattern, "").toLowerCase();
}

export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

export function highlightNeedles(query: string): string[] {
  return tokenizeQuery(query);
}

export function searchPassages(
  passages: readonly PassageSearchable[],
  query: string,
  limit?: number
): PassageSearchResult[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];

  const out: PassageSearchResult[] = [];
  for (const passage of passages) {
    const searchable = `${passage.title ?? ""}\n${passage.content ?? ""}`;
    const normalized = normalizeSearchText(searchable);
    let ok = true;
    for (const term of terms) {
      if (!normalized.includes(term)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    let score = 0;
    const matches: string[] = [];
    for (const term of terms) {
      let count = 0;
      let from = 0;
      while (true) {
        const i = normalized.indexOf(term, from);
        if (i === -1) break;
        count += 1;
        from = i + Math.max(1, term.length);
      }
      score += count;
      if (count > 0) matches.push(term);
    }

    const firstTerm = terms[0] ?? "";
    const firstIndex = normalized.indexOf(firstTerm);
    const start = Math.max(0, firstIndex - 70);
    const end = Math.min(normalized.length, firstIndex + firstTerm.length + 90);
    const snippet = (firstIndex >= 0 ? normalized.slice(start, end) : normalized.slice(0, 160)).trim();

    out.push({ passage, score, snippet, matches });
  }

  out.sort((a, b) => b.score - a.score || a.passage.number - b.passage.number);
  if (limit && limit > 0) return out.slice(0, limit);
  return out;
}
