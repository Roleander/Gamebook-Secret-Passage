"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Link2, Unlink, ArrowDown, ArrowUp } from "lucide-react";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: { targetId: string; target: { number: number } }[];
  incomingLinks: { sourceId: string; source: { number: number } }[];
}

interface PassageEditorProps {
  passage: Passage;
  allPassages: Passage[];
  onUpdate: (updates: Partial<Passage>) => void;
  onDelete: () => void;
}

export function PassageEditor({
  passage,
  allPassages,
  onUpdate,
  onDelete,
}: PassageEditorProps) {
  const [title, setTitle] = useState(passage.title || "");
  const [content, setContent] = useState(passage.content);
  const [isStart, setIsStart] = useState(passage.isStart);
  const [isEndpoint, setIsEndpoint] = useState(passage.isEndpoint);
  const [showOutgoingDialog, setShowOutgoingDialog] = useState(false);
  const [showIncomingDialog, setShowIncomingDialog] = useState(false);
  const [linkTarget, setLinkTarget] = useState<number | "">("");

  const handleSave = () => {
    onUpdate({
      title: title || null,
      content,
      isStart,
      isEndpoint,
    });
  };

  const handleCreateOutgoingLink = async () => {
    if (linkTarget === "") return;

    const targetPassage = allPassages.find(p => p.number === linkTarget);
    if (!targetPassage) {
      alert("Pasaje destino no encontrado");
      return;
    }

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: passage.id,
          targetId: targetPassage.id,
          linkText: `Ve al pasaje ${linkTarget}`,
        }),
      });

      if (response.ok) {
        setShowOutgoingDialog(false);
        setLinkTarget("");
        onUpdate({});
      }
    } catch (error) {
      console.error("Error creating link:", error);
    }
  };

  const handleCreateIncomingLink = async () => {
    if (linkTarget === "") return;

    const sourcePassage = allPassages.find(p => p.number === linkTarget);
    if (!sourcePassage) {
      alert("Pasaje origen no encontrado");
      return;
    }

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: sourcePassage.id,
          targetId: passage.id,
          linkText: `Ve al pasaje ${passage.number}`,
        }),
      });

      if (response.ok) {
        setShowIncomingDialog(false);
        setLinkTarget("");
        onUpdate({});
      }
    } catch (error) {
      console.error("Error creating link:", error);
    }
  };

  const handleDeleteLink = async (targetId: string) => {
    try {
      const response = await fetch(
        `/api/links?sourceId=${passage.id}&targetId=${targetId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        onUpdate({});
      }
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  // Available passages for linking (excluding current)
  const availableForOutgoing = allPassages.filter(p => p.number !== passage.number);
  const availableForIncoming = allPassages.filter(
    p => p.number !== passage.number && !passage.incomingLinks.some(l => l.sourceId === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">
          Pasaje {passage.number}
          {passage.title && (
            <span className="text-muted-foreground ml-2">- {passage.title}</span>
          )}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="passage-title" className="text-sm font-medium">
            Título
          </label>
          <Input
            id="passage-title"
            placeholder="Título del pasaje (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isStart}
              onChange={(e) => setIsStart(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Es inicio</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isEndpoint}
              onChange={(e) => setIsEndpoint(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Es final</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="passage-content" className="text-sm font-medium">
          Contenido
        </label>
        <textarea
          id="passage-content"
          className="flex min-h-[300px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
          placeholder="Escribe el contenido del pasaje aquí..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Links Section */}
      <div className="grid md:grid-cols-2 gap-6 border-t border-border pt-6">
        {/* Outgoing Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowUp className="w-4 h-4 mr-2 text-green-500" />
              Enlaces Salientes ({passage.outgoingLinks.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowOutgoingDialog(true);
                setLinkTarget("");
              }}
            >
              <Link2 className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </div>

          {passage.outgoingLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin enlaces salientes
            </p>
          ) : (
            <div className="space-y-2">
              {passage.outgoingLinks.map((link) => (
                <div
                  key={link.targetId}
                  className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                >
                  <span className="flex items-center">
                    <Link2 className="w-4 h-4 mr-2 text-green-500" />
                    → Pasaje {link.target.number}
                  </span>
                  <button
                    onClick={() => handleDeleteLink(link.targetId)}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowDown className="w-4 h-4 mr-2 text-blue-500" />
              Enlaces Entrantes ({passage.incomingLinks.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowIncomingDialog(true);
                setLinkTarget("");
              }}
            >
              <Link2 className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </div>

          {passage.incomingLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin enlaces entrantes
            </p>
          ) : (
            <div className="space-y-2">
              {passage.incomingLinks.map((link) => (
                <div
                  key={link.sourceId}
                  className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                >
                  <span className="flex items-center">
                    <Link2 className="w-4 h-4 mr-2 text-blue-500" />
                    ← Pasaje {link.source.number}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/links?sourceId=${link.sourceId}&targetId=${passage.id}`,
                          { method: "DELETE" }
                        );
                        if (response.ok) onUpdate({});
                      } catch (error) {
                        console.error("Error:", error);
                      }
                    }}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outgoing Link Dialog */}
      {showOutgoingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border-medieval">
            <h3 className="text-lg font-medium mb-4">Añadir Enlace Saliente</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pasaje destino</label>
                <Input
                  type="number"
                  placeholder="Número del pasaje"
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(parseInt(e.target.value) || "")}
                />
                <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
                  {availableForOutgoing.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setLinkTarget(p.number)}
                      className="text-xs px-2 py-1 bg-muted rounded hover:bg-primary hover:text-primary-foreground"
                    >
                      {p.number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowOutgoingDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateOutgoingLink} disabled={linkTarget === ""}>
                  Crear Enlace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Link Dialog */}
      {showIncomingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border-medieval">
            <h3 className="text-lg font-medium mb-4">Añadir Enlace Entrante</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona el pasaje que enlazará hacia este pasaje ({passage.number})
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pasaje origen</label>
                <Input
                  type="number"
                  placeholder="Número del pasaje origen"
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(parseInt(e.target.value) || "")}
                />
                <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
                  {availableForIncoming.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setLinkTarget(p.number)}
                      className="text-xs px-2 py-1 bg-muted rounded hover:bg-primary hover:text-primary-foreground"
                    >
                      {p.number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowIncomingDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateIncomingLink} disabled={linkTarget === ""}>
                  Crear Enlace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
