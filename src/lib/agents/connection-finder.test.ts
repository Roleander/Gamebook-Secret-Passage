import { describe, expect, it } from "vitest";
import { ConnectionFinderAgent } from "@/lib/agents/connection-finder";

const agent = new ConnectionFinderAgent();

describe("ConnectionFinderAgent.findConnections", () => {
  it("detects explicit keyword references", () => {
    const result = agent.findConnections([
      { number: 1, content: "Ve al pasaje 2 para continuar." },
      { number: 2, content: "Aquí acabas." },
    ]);
    expect(
      result.connections.some(
        (c) => c.sourceNumber === 1 && c.targetNumber === 2
      )
    ).toBe(true);
  });

  it("detects references in other languages", () => {
    const result = agent.findConnections([
      { number: 1, content: "Turn to 5 now." },
      { number: 5, content: "Fin." },
    ]);
    expect(
      result.connections.some(
        (c) => c.sourceNumber === 1 && c.targetNumber === 5
      )
    ).toBe(true);
  });

  it("filters out game mechanics", () => {
    const result = agent.findConnections([
      { number: 1, content: "Si quieres luchar, entonces recibirás 20 de daño." },
      { number: 20, content: "Daño máximo." },
    ]);
    expect(
      result.connections.filter((c) => c.targetNumber === 20)
    ).toEqual([]);
  });

  it("keeps bracket references", () => {
    const result = agent.findConnections([
      { number: 1, content: "Elige (4)." },
      { number: 4, content: "Fin." },
    ]);
    expect(
      result.connections.some(
        (c) => c.sourceNumber === 1 && c.targetNumber === 4
      )
    ).toBe(true);
  });
});
