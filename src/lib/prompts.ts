export interface PromptPassage {
  number: number;
  content: string;
}

export interface PassageBlocks {
  blocks: string[];
  truncated: boolean;
}

export const MAX_CONTENT_PER_PASSAGE = 1200;
export const MAX_PROMPT_CHARS = 60_000;
export const MAX_RAW_CHARS = 60_000;
export const MAX_SEGMENTS = 400;

export function collectPassageBlocks(passages: PromptPassage[]): PassageBlocks {
  let usedChars = 0;
  const blocks: string[] = [];
  let truncated = false;

  for (const p of passages) {
    let content = p.content;
    if (content.length > MAX_CONTENT_PER_PASSAGE) {
      content = content.slice(0, MAX_CONTENT_PER_PASSAGE) + "…";
    }
    const block = `\n## ${p.number}\n${content}`;
    if (usedChars + block.length > MAX_PROMPT_CHARS) {
      truncated = true;
      break;
    }
    blocks.push(block);
    usedChars += block.length;
  }

  return { blocks, truncated };
}

export function buildConnectionsSystemPrompt(): string {
  return [
    "You are an editorial agent for interactive gamebooks (choose-your-own-adventure books).",
    "You receive numbered passages and must find narrative connections: which passage should link to which.",
    'Return ONLY JSON: {"connections":[{"sourceNumber":n,"targetNumber":n,"type":"explicit"|"implicit"|"suggested","text":"short link label","confidence":0.0}]}',
    "type: explicit = the passage text explicitly references the other passage; implicit = the plot strongly implies continuing there; suggested = a plausible thematic option.",
    "Never suggest self-links or links to unknown numbers. Prefer quality over quantity: only plausible connections.",
    'The "text" label must be short (max 8 words) and written in the same language as the passages.',
    "confidence is between 0 and 1.",
  ].join("\n");
}

export function buildConnectionsUserPrompt(options: {
  title: string;
  passages: PromptPassage[];
  existingPairs: string[];
}): { prompt: string; truncated: boolean } {
  const { blocks, truncated } = collectPassageBlocks(options.passages);

  const existingNote = options.existingPairs.length
    ? `\n\nAlready linked pairs (do not repeat them): ${options.existingPairs
        .slice(0, 300)
        .join(", ")}`
    : "";

  const truncationNote = truncated
    ? "\n\n(The list of passages was truncated by length limit; only suggest links among the passages shown above.)"
    : "";

  return {
    prompt: `Passages of the gamebook "${options.title}":\n${blocks.join("\n")}${truncationNote}${existingNote}`,
    truncated,
  };
}

export function buildSegmentSystemPrompt(): string {
  return [
    "You are an editorial agent for interactive gamebooks (choose-your-own-adventure books).",
    "You receive the raw text of a book (possibly a full document export) and must split it into passages.",
    "Split at chapter/scene markers: chapter titles, numbered headings (e.g. '1.', 'Chapter 3', 'Paso 2'), all-caps titles, markdown headings, or clear scene breaks.",
    "Each passage must be self-contained, coherent, and at least one paragraph long. Keep the original text unchanged inside each passage — do not rewrite or summarize it.",
    'Return ONLY JSON: {"segments":[{"title":"short title or null","content":"full original text of the passage"}]}',
    "The segments must cover the provided text in order. Titles and content must be in the same language as the source text.",
  ].join("\n");
}

export function buildSegmentUserPrompt(title: string, rawText: string): {
  prompt: string;
  truncated: boolean;
} {
  const truncated = rawText.length > MAX_RAW_CHARS;
  const inputText = truncated ? rawText.slice(0, MAX_RAW_CHARS) : rawText;
  return {
    prompt: `Book title: ${title}\n\nRaw text:\n\n${inputText}`,
    truncated,
  };
}
