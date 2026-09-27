import { describe, expect, it } from "vitest";
import { computeGraphLayout, GRAPH_NODE_SIZE, GraphInputNode } from "@/lib/graph-layout";

function node(
  id: string,
  number: number,
  outgoingLinkTargets: string[],
  extra: Partial<GraphInputNode> = {}
): GraphInputNode {
  return {
    id,
    number,
    title: null,
    isStart: false,
    isEndpoint: false,
    outgoingLinkTargets,
    ...extra,
  };
}

describe("computeGraphLayout", () => {
  it("lays the start passage in layer 0", () => {
    const layout = computeGraphLayout([
      node("a", 1, ["b"], { isStart: true }),
      node("b", 2, []),
    ]);

    const a = layout.nodes.find((n) => n.id === "a");
    const b = layout.nodes.find((n) => n.id === "b");
    expect(a?.layer).toBe(0);
    expect(b?.layer).toBe(1);
    expect(b!.x).toBeGreaterThan(a!.x);
  });

  it("places passages without links in a fallback layer", () => {
    const layout = computeGraphLayout([
      node("a", 1, ["b"], { isStart: true }),
      node("b", 2, []),
      node("orphan", 3, []),
    ]);

    const orphan = layout.nodes.find((n) => n.id === "orphan");
    const b = layout.nodes.find((n) => n.id === "b");
    expect(orphan!.layer).toBeGreaterThan(b!.layer);
  });

  it("stacks passages of the same layer vertically without overlap", () => {
    const layout = computeGraphLayout([
      node("a", 1, ["b", "c"], { isStart: true }),
      node("b", 2, []),
      node("c", 3, []),
    ]);

    const b = layout.nodes.find((n) => n.id === "b")!;
    const c = layout.nodes.find((n) => n.id === "c")!;
    expect(b.layer).toBe(c.layer);
    expect(c.y - b.y).toBe(GRAPH_NODE_SIZE.height + 36);
  });

  it("creates one edge per unique link and skips self links", () => {
    const layout = computeGraphLayout([
      node("a", 1, ["b", "b", "a"], { isStart: true }),
      node("b", 2, []),
    ]);

    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]).toEqual({ sourceId: "a", targetId: "b" });
  });

  it("ignores links pointing to missing passages", () => {
    const layout = computeGraphLayout([
      node("a", 1, ["ghost"], { isStart: true }),
      node("b", 2, []),
    ]);

    expect(layout.edges).toHaveLength(0);
  });

  it("returns a canvas that contains every node", () => {
    const layout = computeGraphLayout([
      node("a", 1, ["b"], { isStart: true }),
      node("b", 2, ["c"]),
      node("c", 3, []),
    ]);

    for (const n of layout.nodes) {
      expect(n.x + GRAPH_NODE_SIZE.width).toBeLessThanOrEqual(layout.width);
      expect(n.y + GRAPH_NODE_SIZE.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it("handles an empty project", () => {
    const layout = computeGraphLayout([]);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.edges).toHaveLength(0);
  });
});
