import { describe, expect, it } from "vitest";
import {
  buildConnectionsSystemPrompt,
  buildConnectionsUserPrompt,
  buildSegmentSystemPrompt,
  buildSegmentUserPrompt,
  collectPassageBlocks,
  MAX_CONTENT_PER_PASSAGE,
  MAX_PROMPT_CHARS,
  MAX_RAW_CHARS,
} from "@/lib/prompts";

describe("connections system prompt", () => {
  const prompt = buildConnectionsSystemPrompt();

  it("demands JSON-only output with the exact response shape", () => {
    expect(prompt).toContain('Return ONLY JSON: {"connections"');
    expect(prompt).toContain("sourceNumber");
    expect(prompt).toContain("targetNumber");
    expect(prompt).toContain("confidence");
  });

  it("defines the three connection types", () => {
    expect(prompt).toContain('"explicit"|"implicit"|"suggested"');
    expect(prompt).toContain("explicit =");
    expect(prompt).toContain("implicit =");
    expect(prompt).toContain("suggested =");
  });

  it("forbids self-links and unknown passage numbers", () => {
    expect(prompt).toContain("Never suggest self-links or links to unknown numbers");
  });

  it("requires labels in the passages' language and bounded confidence", () => {
    expect(prompt).toContain("same language as the passages");
    expect(prompt).toContain("confidence is between 0 and 1");
  });
});

describe("collectPassageBlocks", () => {
  it("formats blocks with markdown headings", () => {
    const { blocks, truncated } = collectPassageBlocks([
      { number: 3, content: "Hola" },
    ]);
    expect(blocks).toEqual(["\n## 3\nHola"]);
    expect(truncated).toBe(false);
  });

  it("truncates overlong passage content with an ellipsis", () => {
    const { blocks } = collectPassageBlocks([
      { number: 1, content: "x".repeat(MAX_CONTENT_PER_PASSAGE + 500) },
    ]);
    expect(blocks[0].endsWith("…")).toBe(true);
    expect(blocks[0].length).toBeLessThan(MAX_CONTENT_PER_PASSAGE + 10);
  });

  it("stops at the prompt char budget and flags truncation", () => {
    const passages = Array.from({ length: 80 }, (_, i) => ({
      number: i + 1,
      content: "y".repeat(10_000),
    }));
    const { blocks, truncated } = collectPassageBlocks(passages);

    expect(truncated).toBe(true);
    expect(blocks.length).toBeLessThan(passages.length);
    const used = blocks.reduce((sum, b) => sum + b.length, 0);
    expect(used).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
  });
});

describe("connections user prompt", () => {
  it("includes the title, passage blocks and existing pairs note", () => {
    const { prompt, truncated } = buildConnectionsUserPrompt({
      title: "La cueva",
      passages: [{ number: 1, content: "Empiezas" }],
      existingPairs: ["1->2"],
    });
    expect(prompt).toContain('gamebook "La cueva"');
    expect(prompt).toContain("## 1");
    expect(prompt).toContain("Already linked pairs (do not repeat them): 1->2");
    expect(truncated).toBe(false);
  });

  it("adds the truncation note when the passage list was cut", () => {
    const passages = Array.from({ length: 80 }, (_, i) => ({
      number: i + 1,
      content: "y".repeat(10_000),
    }));
    const { prompt, truncated } = buildConnectionsUserPrompt({
      title: "G",
      passages,
      existingPairs: [],
    });
    expect(truncated).toBe(true);
    expect(prompt).toContain("truncated by length limit");
    expect(prompt).not.toContain("Already linked pairs");
  });
});

describe("segment prompts", () => {
  it("system prompt demands JSON segments without rewriting", () => {
    const prompt = buildSegmentSystemPrompt();
    expect(prompt).toContain('Return ONLY JSON: {"segments"');
    expect(prompt).toContain("do not rewrite or summarize");
    expect(prompt).toContain("same language as the source text");
  });

  it("user prompt embeds the title and raw text", () => {
    const { prompt, truncated } = buildSegmentUserPrompt("Mi libro", "Texto aquí");
    expect(prompt).toContain("Book title: Mi libro");
    expect(prompt).toContain("Texto aquí");
    expect(truncated).toBe(false);
  });

  it("truncates raw text beyond the budget", () => {
    const { prompt, truncated } = buildSegmentUserPrompt(
      "G",
      "z".repeat(MAX_RAW_CHARS + 100)
    );
    expect(truncated).toBe(true);
    expect(prompt.length).toBeLessThan(MAX_RAW_CHARS + 100);
  });
});
