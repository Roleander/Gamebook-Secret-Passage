"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { computeGraphLayout, GRAPH_NODE_SIZE } from "@/lib/graph-layout";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Maximize2 } from "lucide-react";

export interface GraphPassage {
  id: string;
  number: number;
  title: string | null;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: { targetId: string }[];
}

interface PassageGraphProps {
  passages: GraphPassage[];
  selectedPassageId?: string;
  onSelect: (passage: GraphPassage) => void;
}

export function PassageGraph({ passages, selectedPassageId, onSelect }: PassageGraphProps) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);

  const layout = useMemo(
    () =>
      computeGraphLayout(
        passages.map((p) => ({
          id: p.id,
          number: p.number,
          title: p.title,
          isStart: p.isStart,
          isEndpoint: p.isEndpoint,
          outgoingLinkTargets: p.outgoingLinks.map((l) => l.targetId),
        }))
      ),
    [passages]
  );

  const byId = useMemo(() => new Map(passages.map((p) => [p.id, p])), [passages]);

  if (passages.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        {t("Graph.empty")}
      </div>
    );
  }

  const { nodes, edges, width, height } = layout;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const clampZoom = (z: number) => Math.min(1.8, Math.max(0.4, Math.round(z * 10) / 10));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-primary bg-primary/25" />
            {t("Graph.startLegend")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-destructive bg-destructive/25" />
            {t("Graph.endLegend")}
          </span>
          <span>{t("Graph.hint")}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label={t("Graph.zoomOut")}
            onClick={() => setZoom((z) => clampZoom(z - 0.2))}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="100%"
            onClick={() => setZoom(1)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("Graph.zoomIn")}
            onClick={() => setZoom((z) => clampZoom(z + 0.2))}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-border bg-muted/30 max-h-[70vh]">
        <div
          style={{
            width: width * zoom,
            height: height * zoom,
            position: "relative",
          }}
        >
          <svg
            width={width * zoom}
            height={height * zoom}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={t("Graph.tab")}
          >
            <defs>
              <marker
                id="graph-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
              </marker>
            </defs>

            {edges.map((edge) => {
              const source = nodeById.get(edge.sourceId);
              const target = nodeById.get(edge.targetId);
              if (!source || !target) return null;

              const x1 = source.x + GRAPH_NODE_SIZE.width;
              const y1 = source.y + GRAPH_NODE_SIZE.height / 2;
              const x2 = target.x;
              const y2 = target.y + GRAPH_NODE_SIZE.height / 2;
              const midX = (x1 + x2) / 2;

              return (
                <path
                  key={`${edge.sourceId}->${edge.targetId}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="text-muted-foreground/60"
                  markerEnd="url(#graph-arrow)"
                />
              );
            })}

            {nodes.map((n) => {
              const passage = byId.get(n.id);
              const selected = n.id === selectedPassageId;
              const strokeClass = selected
                ? "stroke-primary"
                : n.isStart
                  ? "stroke-primary"
                  : n.isEndpoint
                    ? "stroke-destructive"
                    : "border-border";
              const fillClass = n.isStart
                ? "fill-primary/20"
                : n.isEndpoint
                  ? "fill-destructive/15"
                  : "fill-card";

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  className="cursor-pointer"
                  onClick={() => passage && onSelect(passage)}
                  role="button"
                  aria-label={`Pasaje ${n.number}`}
                >
                  <rect
                    width={GRAPH_NODE_SIZE.width}
                    height={GRAPH_NODE_SIZE.height}
                    rx={8}
                    strokeWidth={selected ? 2.5 : 1.5}
                    className={`${fillClass} ${strokeClass}`}
                  />
                  <text
                    x={10}
                    y={22}
                    className="fill-foreground font-semibold"
                    fontSize={13}
                  >
                    {`#${n.number}`}
                  </text>
                  <text
                    x={10}
                    y={40}
                    className="fill-muted-foreground"
                    fontSize={11}
                  >
                    {(n.title || t("Graph.untitled")).slice(0, 20)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
