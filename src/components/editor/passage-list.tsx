"use client";

import { cn } from "@/lib/utils";
import { BookOpen, Flag, Target } from "lucide-react";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: any[];
}

interface PassageListProps {
  passages: Passage[];
  selectedPassageId?: string;
  onSelectPassage: (passage: Passage) => void;
}

export function PassageList({
  passages,
  selectedPassageId,
  onSelectPassage,
}: PassageListProps) {
  const sortedPassages = [...passages].sort((a, b) => a.number - b.number);

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
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {sortedPassages.map((passage) => (
        <button
          key={passage.id}
          onClick={() => onSelectPassage(passage)}
          className={cn(
            "w-full text-left p-3 rounded-md transition-colors",
            selectedPassageId === passage.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold">
                {passage.number}
              </span>
              {passage.title && (
                <span className="text-sm truncate max-w-[150px]">
                  {passage.title}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {passage.isStart && (
                <Flag className="w-4 h-4 text-green-500" />
              )}
              {passage.isEndpoint && (
                <Target className="w-4 h-4 text-red-500" />
              )}
              {passage.outgoingLinks.length > 0 && (
                <span className="text-xs bg-muted-foreground/20 px-1 rounded">
                  {passage.outgoingLinks.length}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
