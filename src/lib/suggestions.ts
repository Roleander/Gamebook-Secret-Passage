export type SuggestionType = "explicit" | "implicit" | "suggested";

export interface RawSuggestion {
  sourceNumber: number;
  targetNumber: number;
  type?: string;
  text?: string | null;
  confidence?: number;
}

export interface NormalizedSuggestion {
  sourceNumber: number;
  targetNumber: number;
  type: SuggestionType;
  text: string | null;
  confidence: number;
}

const VALID_TYPES: SuggestionType[] = ["explicit", "implicit", "suggested"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSuggestions(
  availableNumbers: number[],
  raw: RawSuggestion[]
): NormalizedSuggestion[] {
  const available = new Set(availableNumbers);
  const seen = new Set<string>();
  const result: NormalizedSuggestion[] = [];

  for (const item of raw) {
    if (!Number.isInteger(item.sourceNumber) || !Number.isInteger(item.targetNumber)) {
      continue;
    }
    if (item.sourceNumber === item.targetNumber) continue;
    if (!available.has(item.sourceNumber) || !available.has(item.targetNumber)) continue;

    const key = `${item.sourceNumber}->${item.targetNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const type = VALID_TYPES.includes(item.type as SuggestionType)
      ? (item.type as SuggestionType)
      : "suggested";

    const text =
      typeof item.text === "string" && item.text.trim().length > 0
        ? item.text.trim().slice(0, 120)
        : null;

    const confidence =
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? clamp(item.confidence, 0, 1)
        : 0;

    result.push({
      sourceNumber: item.sourceNumber,
      targetNumber: item.targetNumber,
      type,
      text,
      confidence,
    });
  }

  return result;
}
