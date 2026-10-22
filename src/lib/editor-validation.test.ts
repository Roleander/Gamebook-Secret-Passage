import { describe, expect, it } from "vitest";
import { validatePassages, type PassageError } from "@/lib/editor-validation";

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}|${JSON.stringify(params)}` : key;

function passage(overrides: Record<string, unknown>) {
  return {
    number: 1,
    content: "",
    isStart: false,
    isEndpoint: false,
    outgoingLinks: [],
    incomingLinks: [],
    ...overrides,
  };
}

describe("validatePassages", () => {
  it("marca como ghost_ref las referencias textuales a pasajes inexistentes", () => {
    const errors = validatePassages(
      [
        passage({
          number: 1,
          isStart: true,
          content: "Luego ve al 9.",
          outgoingLinks: [{ target: { number: 2 } }],
          incomingLinks: [{}],
        }),
        passage({
          number: 2,
          isEndpoint: true,
          content: "Fin de la historia.",
          incomingLinks: [{}],
        }),
      ],
      t
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe("ghost_ref");
    expect(errors[0].passageNumber).toBe(1);
    expect(errors[0].autoFixable).toBe(false);
    expect(errors[0].message).toContain("Editor.ghostRef");
    expect(errors[0].message).toContain('"to":9');
  });

  it("no marca ghost_ref si todos los destinos existen", () => {
    const errors = validatePassages(
      [
        passage({
          number: 1,
          isStart: true,
          content: "Luego ve al 2.",
          outgoingLinks: [{ target: { number: 2 } }],
          incomingLinks: [{}],
        }),
        passage({
          number: 2,
          isEndpoint: true,
          content: "Fin.",
          incomingLinks: [{}],
        }),
      ],
      t
    );
    expect(errors.filter((e) => e.type === "ghost_ref")).toHaveLength(0);
  });

  it("conserva los avisos de enlace roto, huérfano y sin salida", () => {
    const errors = validatePassages(
      [
        passage({
          number: 1,
          isStart: true,
          outgoingLinks: [{ target: { number: 99 } }],
          incomingLinks: [{}],
          content: "Fin.",
        }),
        passage({
          number: 2,
          content: "Nada.",
          outgoingLinks: [{ target: { number: 1 } }],
        }),
      ],
      t
    );
    const types = errors.map((e: PassageError) => e.type);
    expect(types).toContain("broken_link");
    expect(types).toContain("orphan");
  });
});
