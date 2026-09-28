import { describe, expect, it } from "vitest";
import { rewriteLinkTexts } from "@/lib/link-texts";

describe("rewriteLinkTexts", () => {
  it("rewrites passage numbers inside link labels", () => {
    const updates = rewriteLinkTexts(
      [
        { id: "a", linkText: "Ve al pasaje 42" },
        { id: "b", linkText: "Continuar al pasaje 7" },
      ],
      new Map([
        [42, 5],
        [7, 3],
      ])
    );
    expect(updates).toEqual([
      { id: "a", linkText: "Ve al pasaje 5" },
      { id: "b", linkText: "Continuar al pasaje 3" },
    ]);
  });

  it("ignores links without label text", () => {
    const updates = rewriteLinkTexts([{ id: "a", linkText: null }], {
      1: 2,
    });
    expect(updates).toEqual([]);
  });

  it("skips labels whose numbers did not change", () => {
    const updates = rewriteLinkTexts(
      [{ id: "a", linkText: "Ve al pasaje 9" }],
      new Map([[1, 2]])
    );
    expect(updates).toEqual([]);
  });

  it("respects word boundaries in labels", () => {
    const updates = rewriteLinkTexts(
      [{ id: "a", linkText: "Pasaje 12 y 120" }],
      new Map([[12, 4]])
    );
    expect(updates).toEqual([{ id: "a", linkText: "Pasaje 4 y 120" }]);
  });
});
