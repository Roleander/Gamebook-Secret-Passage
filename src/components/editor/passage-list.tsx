"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Flag, Target, ChevronUp, ChevronDown, Hash, GripVertical } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useI18n } from "@/lib/i18n";
import { queueableFetch } from "@/lib/offline-client";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: unknown[];
}

interface PassageListProps {
  passages: Passage[];
  selectedPassageId?: string;
  onSelectPassage: (passage: Passage) => void;
  onReorder?: () => void;
  onRenumber?: () => void;
}

interface SortableRowProps {
  passage: Passage;
  index: number;
  count: number;
  isSelected: boolean;
  isEditing: boolean;
  editValue: number;
  draggable: boolean;
  onEditValueChange: (value: number) => void;
  onSelectPassage: (passage: Passage) => void;
  onStartEdit: (passage: Passage) => void;
  onCancelEdit: () => void;
  onCommitEdit: (passageId: string) => void;
  onMove: (e: React.MouseEvent, passageId: string, direction: "up" | "down") => void;
}

function SortableRow({
  passage,
  index,
  count,
  isSelected,
  isEditing,
  editValue,
  draggable,
  onEditValueChange,
  onSelectPassage,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onMove,
}: SortableRowProps) {
  const { t } = useI18n();
  const { isDragging, ref, handleRef } = useSortable({ id: passage.id, index });
  const firstLine = passage.content.split("\n")[0]?.trim() || "";
  const preview = firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine;

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center group",
        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        isDragging && "opacity-50"
      )}
    >
      {draggable ? (
        <button
          ref={handleRef}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground shrink-0"
          title={t("PassageList.drag")}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}

      {/* Move buttons */}
      <div className="flex flex-col px-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => onMove(e, passage.id, "up")}
          disabled={index === 0}
          className={cn(
            "p-0.5 rounded hover:bg-muted-foreground/20",
            index === 0 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => onMove(e, passage.id, "down")}
          disabled={index === count - 1}
          className={cn(
            "p-0.5 rounded hover:bg-muted-foreground/20",
            index === count - 1 && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

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
            {/* Editable number */}
            {isEditing ? (
              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => onEditValueChange(parseInt(e.target.value) || 0)}
                  onBlur={() => onCommitEdit(passage.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitEdit(passage.id);
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  className="w-16 px-1 py-0.5 text-xs bg-background text-foreground border rounded"
                  autoFocus
                  min={1}
                />
                <button
                  onClick={() => onCommitEdit(passage.id)}
                  className="text-[10px] px-1 bg-green-600 text-white rounded"
                >
                  {t("PassageList.ok")}
                </button>
              </div>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(passage);
                }}
                className="font-mono text-xs font-bold cursor-pointer hover:bg-muted-foreground/20 px-1 rounded flex items-center"
                title={t("PassageList.editNumber")}
              >
                {passage.number}
                <Hash className="w-2.5 h-2.5 ml-0.5 opacity-50" />
              </span>
            )}
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
}

export function PassageList({
  passages,
  selectedPassageId,
  onSelectPassage,
  onReorder,
  onRenumber,
}: PassageListProps) {
  const { t } = useI18n();
  const sortedPassages = [...passages].sort((a, b) => a.number - b.number);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const handleMove = async (e: React.MouseEvent, passageId: string, direction: "up" | "down") => {
    e.stopPropagation();
    const result = await queueableFetch(`/api/passages/${passageId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (result.ok && !result.queued && onReorder) {
      onReorder();
    }
  };

  const handleDrop = async (sourceId: string, targetId: string) => {
    const source = sortedPassages.find((p) => p.id === sourceId);
    const target = sortedPassages.find((p) => p.id === targetId);
    if (!source || !target || source.number === target.number) return;
    const result = await queueableFetch(`/api/passages/${sourceId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toNumber: target.number }),
    });
    if (result.ok && !result.queued && onReorder) {
      onReorder();
    }
  };

  const handleRenumber = async (passageId: string) => {
    if (editValue < 1) {
      setEditingId(null);
      return;
    }

    const result = await queueableFetch(`/api/passages/${passageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: editValue }),
    });
    if (result.ok) {
      setEditingId(null);
      if (onRenumber && !result.queued) onRenumber();
    }
  };

  if (sortedPassages.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          {t("PassageList.empty")}
        </p>
      </div>
    );
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const { source, target } = event.operation;
        if (!source || !target || source.id === target.id) return;
        void handleDrop(String(source.id), String(target.id));
      }}
    >
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {sortedPassages.map((passage, index) => (
          <SortableRow
            key={passage.id}
            passage={passage}
            index={index}
            count={sortedPassages.length}
            isSelected={selectedPassageId === passage.id}
            isEditing={editingId === passage.id}
            editValue={editValue}
            draggable={Boolean(onReorder)}
            onEditValueChange={setEditValue}
            onSelectPassage={onSelectPassage}
            onStartEdit={(p) => {
              setEditingId(p.id);
              setEditValue(p.number);
            }}
            onCancelEdit={() => setEditingId(null)}
            onCommitEdit={handleRenumber}
            onMove={handleMove}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
