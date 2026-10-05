interface RateWindow {
  hits: number[];
}

const windows = new Map<string, RateWindow>();
const MAX_KEYS = 20_000;

export interface RateLimitCheck {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitCheck {
  if (windows.size >= MAX_KEYS && !windows.has(key)) {
    windows.clear();
  }

  let window = windows.get(key);
  if (!window) {
    window = { hits: [] };
    windows.set(key, window);
  }

  window.hits = window.hits.filter((hit) => now - hit < windowMs);

  if (window.hits.length >= limit) {
    const oldest = window.hits[0];
    const retryAfterMs = oldest + windowMs - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  window.hits.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  windows.clear();
}
