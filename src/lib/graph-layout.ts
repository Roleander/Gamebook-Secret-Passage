export interface GraphInputNode {
  id: string;
  number: number;
  title: string | null;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinkTargets: string[];
}

export interface GraphNode extends GraphInputNode {
  layer: number;
  order: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

const NODE_W = 150;
const NODE_H = 56;
const GAP_X = 90;
const GAP_Y = 36;

export function computeGraphLayout(passages: GraphInputNode[]): GraphLayout {
  const byId = new Map(passages.map((p) => [p.id, p]));

  const start =
    passages.find((p) => p.isStart) ??
    passages.slice().sort((a, b) => a.number - b.number)[0];

  const layerById = new Map<string, number>();
  if (start) {
    const queue: string[] = [start.id];
    layerById.set(start.id, 0);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      const currentLayer = layerById.get(current) ?? 0;
      for (const targetId of byId.get(current)?.outgoingLinkTargets ?? []) {
        if (!byId.has(targetId)) continue;
        if (layerById.has(targetId)) continue;
        layerById.set(targetId, currentLayer + 1);
        queue.push(targetId);
      }
    }
  }

  // Unreachable passages go to a fallback layer after the deepest one
  let maxLayer = 0;
  for (const layer of layerById.values()) maxLayer = Math.max(maxLayer, layer);

  const fallbackLayer = maxLayer + 1;
  const ordered = passages.slice().sort((a, b) => a.number - b.number);

  const layerBuckets = new Map<number, GraphInputNode[]>();
  for (const passage of ordered) {
    const layer = layerById.get(passage.id) ?? fallbackLayer;
    const bucket = layerBuckets.get(layer);
    if (bucket) bucket.push(passage);
    else layerBuckets.set(layer, [passage]);
  }

  const nodes: GraphNode[] = [];
  let maxY = 0;
  let maxX = 0;
  for (const [layer, bucket] of layerBuckets) {
    bucket.forEach((passage, order) => {
      const x = 40 + layer * (NODE_W + GAP_X);
      const y = 40 + order * (NODE_H + GAP_Y);
      nodes.push({ ...passage, layer, order, x, y });
      maxX = Math.max(maxX, x + NODE_W);
      maxY = Math.max(maxY, y + NODE_H);
    });
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const passage of passages) {
    for (const targetId of passage.outgoingLinkTargets) {
      if (!byId.has(targetId)) continue;
      if (targetId === passage.id) continue;
      const key = `${passage.id}->${targetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ sourceId: passage.id, targetId });
    }
  }

  return {
    nodes,
    edges,
    width: maxX + 40,
    height: maxY + 40,
  };
}

export const GRAPH_NODE_SIZE = { width: NODE_W, height: NODE_H };
