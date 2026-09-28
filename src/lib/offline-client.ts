import { enqueueMutation, makeSyntheticId } from "./offline-queue";

export interface QueueableResult {
  ok: boolean;
  queued: boolean;
  response: Response | null;
  syntheticId?: string;
}

export interface QueueableOptions {
  /** Genera un id sintético reutilizable si la mutación queda encolada (creaciones). */
  syntheticPassage?: boolean;
}

export async function queueableFetch(
  url: string,
  init: RequestInit = {},
  options: QueueableOptions = {}
): Promise<QueueableResult> {
  const method = (init.method || "GET").toUpperCase();
  const body =
    typeof init.body === "string" ? init.body : undefined;

  const enqueue = async (): Promise<QueueableResult> => {
    const syntheticId = options.syntheticPassage ? makeSyntheticId() : undefined;
    await enqueueMutation({
      url,
      method,
      headers: (init.headers as Record<string, string>) || undefined,
      body,
      syntheticId,
    });
    return { ok: true, queued: true, response: null, syntheticId };
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return enqueue();
  }

  try {
    const response = await fetch(url, init);
    return { ok: response.ok, queued: false, response };
  } catch {
    return enqueue();
  }
}
