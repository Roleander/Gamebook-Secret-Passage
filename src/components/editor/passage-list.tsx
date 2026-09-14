"use client";

import { cn } from "@/lib/utils";
import { BookOpen, Flag, Target, ChevronUp, ChevronDown } from "lucide-react";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: any[];
}

interface PassageListProps {
  passages: Passage[];
  selectedPassageId?: string;
  onSelectPassage: (passage: Passage) => void;
  onReorder?: () => void;
}

export function PassageList({
  passages,
  selectedPassageId,
  onSelectPassage,
  onReorder,
}: PassageListProps) {
  const sortedPassages = [...passages].sort((a, b) => a.number - b.number);

  const handleMove = async (e: React.MouseEvent, passageId: string, direction: "up" | "down") => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/passages/${passageId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (response.ok && onReorder) {
        onReorder();
      }
    } catch (error) {
      console.error("Error reordering:", error);
    }
  };

  if (sortedPassages.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          No hay pasajes aún. Importa un archivo para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[600px] overflow-y-auto">
      {sortedPassages.map((passage, index) => {
        const firstLine = passage.content.split("\n")[0]?.trim() || "";
        const preview = firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine;
        const isSelected = selectedPassageId === passage.id;

        return (
          <div
            key={passage.id}
            className={cn(
              "flex items-center group",
              isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {/* Move buttons */}
            {onReorder && (
              <div className="flex flex-col px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleMove(e, passage.id, "up")}
                  disabled={index === 0}
                  className={cn(
                    "p-0.5 rounded hover:bg-muted-foreground/20",
                    index === 0 && "opacity-30 cursor-not-allowed"
                  )}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => handleMove(e, passage.id, "down")}
                  disabled={index === sortedPassages.length - 1}
                  className={cn(
                    "p-0.5 rounded hover:bg-muted-foreground/20",
                    index === sortedPassages.length - 1 && "opacity-30 cursor-not-allowed"
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Passage button */}
            <button
              onClick={() => onSelectPassage(passage)}
              className={cn(
                "flex-1 text-left p-2 rounded-md transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : ""
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold">
                    {passage.number}
                  </span>
                  {passage.title && (
                    <span className="text-xs font-medium truncate max-w-[120px]">
                      {passage.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {passage.isStart && (
                    <Flag className="w-3 h-3 text-green-500" />
                  )}
                  {passage.isEndpoint && (
                    <Target className="w-3 h-3 text-red-500" />
                  )}
                  {passage.outgoingLinks.length > 0 && (
                    <span className="text-[10px] bg-muted-foreground/20 px-1 rounded">
                      {passage.outgoingLinks.length}→
                    </span>
                  )}
                </div>
              </div>
              {preview && (
                <p className={cn(
                  "text-[10px] line-clamp-1",
                  isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {preview}
                </p>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
