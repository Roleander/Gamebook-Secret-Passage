const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI_NOT_CONFIGURED");
    this.name = "AiNotConfiguredError";
  }
}

export class AiRateLimitError extends Error {
  constructor() {
    super("AI_RATE_LIMIT");
    this.name = "AiRateLimitError";
  }
}

export class AiHttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "AiHttpError";
  }
}

export class AiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiOutputError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown } }[];
}

export async function chatJson(
  system: string,
  user: string,
  maxTokens = 4096
): Promise<unknown> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError();

  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  const doFetch = (withResponseFormat: boolean): Promise<Response> => {
    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    };
    if (withResponseFormat) payload.response_format = { type: "json_object" };

    return fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000),
    });
  };

  let res = await doFetch(true);
  if (res.status === 400) {
    // Some OpenAI-compatible providers reject response_format; retry without it
    res = await doFetch(false);
  }

  if (res.status === 429) throw new AiRateLimitError();
  if (!res.ok) throw new AiHttpError(res.status, `AI HTTP ${res.status}`);

  const data = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new AiOutputError("empty completion");
  }

  try {
    return JSON.parse(stripCodeFences(content));
  } catch {
    throw new AiOutputError("model returned invalid JSON");
  }
}
