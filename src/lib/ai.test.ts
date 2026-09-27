import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AiHttpError,
  AiNotConfiguredError,
  AiOutputError,
  AiRateLimitError,
  chatJson,
} from "@/lib/ai";

function completion(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AI_API_KEY", "test-key");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("chatJson", () => {
  it("parses a plain JSON completion", async () => {
    fetchMock.mockResolvedValueOnce(completion('{"connections":[]}'));
    const result = await chatJson("sys", "user");
    expect(result).toEqual({ connections: [] });
  });

  it("strips markdown code fences", async () => {
    fetchMock.mockResolvedValueOnce(
      completion('```json\n{"segments":[{"content":"hola"}]}\n```')
    );
    expect(await chatJson("s", "u")).toEqual({ segments: [{ content: "hola" }] });
  });

  it("throws AiOutputError on invalid JSON", async () => {
    fetchMock.mockResolvedValueOnce(completion("not json at all"));
    await expect(chatJson("s", "u")).rejects.toBeInstanceOf(AiOutputError);
  });

  it("throws AiOutputError on empty completion", async () => {
    fetchMock.mockResolvedValueOnce(completion("   "));
    await expect(chatJson("s", "u")).rejects.toBeInstanceOf(AiOutputError);
  });

  it("throws AiRateLimitError on 429", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    await expect(chatJson("s", "u")).rejects.toBeInstanceOf(AiRateLimitError);
  });

  it("throws AiHttpError on other upstream failures", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    await expect(chatJson("s", "u")).rejects.toBeInstanceOf(AiHttpError);
    await expect(chatJson("s", "u")).rejects.toMatchObject({ status: 500 });
  });

  it("throws AiNotConfiguredError without an API key", async () => {
    vi.stubEnv("AI_API_KEY", "");
    await expect(chatJson("s", "u")).rejects.toBeInstanceOf(AiNotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries without response_format when the provider answers 400", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 400 }))
      .mockResolvedValueOnce(completion('{"ok":true}'));

    const result = await chatJson("s", "u");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstPayload.response_format).toEqual({ type: "json_object" });
    expect(secondPayload.response_format).toBeUndefined();
  });

  it("sends auth header, model, temperature and both messages", async () => {
    vi.stubEnv("AI_MODEL", "test-model");
    fetchMock.mockResolvedValueOnce(completion('{"a":1}'));

    await chatJson("the system", "the user");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");

    const payload = JSON.parse(init.body as string);
    expect(payload.model).toBe("test-model");
    expect(payload.temperature).toBe(0.2);
    expect(payload.messages).toEqual([
      { role: "system", content: "the system" },
      { role: "user", content: "the user" },
    ]);
  });
});
