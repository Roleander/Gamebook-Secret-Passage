"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/editor/file-upload";
import { PassageEditor } from "@/components/editor/passage-editor";
import { PassageList } from "@/components/editor/passage-list";
import { ErrorPanel } from "@/components/editor/error-panel";
import { PreviewMode } from "@/components/editor/preview-mode";
import {
  ArrowLeft, Upload, BookOpen, AlertTriangle, Shuffle, Download,
  Trash2, Link2, Wand2, ChevronDown, Eye
} from "lucide-react";
import Link from "next/link";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  sortOrder: number;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: { targetId: string; target: { number: number } }[];
  incomingLinks: { sourceId: string; source: { number: number } }[];
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  passages: Passage[];
}

interface PassageError {
  type: "orphan" | "no_exit" | "broken_link" | "cycle";
  passageNumber: number;
  message: string;
  autoFixable: boolean;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"editor" | "upload" | "errors">("editor");
  const [autoFixing, setAutoFixing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [readingMode, setReadingMode] = useState(true);
  const [preserveStart, setPreserveStart] = useState(true);
  const [canUndo, setCanUndo] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        router.push("/projects");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  // Check for available snapshots (for undo)
  const fetchSnapshots = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/content-shuffle/undo`, {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        setCanUndo(data.hasSnapshot);
      }
    } catch {
      setCanUndo(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchSnapshots();
  }, [fetchProject, fetchSnapshots]);

  const handlePassageUpdate = async (updatedPassage: Partial<Passage>) => {
    if (!selectedPassage) return;
    try {
      const response = await fetch(`/api/passages/${selectedPassage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPassage),
      });
      if (response.ok) {
        fetchProject();
      }
    } catch (error) {
      console.error("Error updating passage:", error);
    }
  };

  const handlePassageDelete = async (passageId: string) => {
    try {
      const response = await fetch(`/api/passages/${passageId}`, { method: "DELETE" });
      if (response.ok) {
        setSelectedPassage(null);
        fetchProject();
      }
    } catch (error) {
      console.error("Error deleting passage:", error);
    }
  };

  const handleContentShuffle = async () => {
    if (!project) return;
    if (!confirm("¿Barajar el contenido entre pasajes? Los números se mantienen, pero el texto y enlaces se reorganizan aleatoriamente.")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/content-shuffle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preserveStart }),
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Contenido barajado: ${result.passageCount} pasajes, ${result.linksCreated} enlaces recreados${result.startPreserved ? " (pasaje de inicio preservado)" : ""}`);
        fetchProject();
        fetchSnapshots();
      }
    } catch (error) {
      console.error("Error shuffling content:", error);
    }
  };

  const handleUndoShuffle = async () => {
    if (!project) return;
    if (!confirm("¿Deshacer el último barajado de contenido?")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/content-shuffle/undo`, {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Deshacer completado: ${result.passageCount} pasajes restaurados, ${result.linksRestored} enlaces restaurados`);
        fetchProject();
        fetchSnapshots();
      }
    } catch (error) {
      console.error("Error undoing shuffle:", error);
    }
  };

  const handleExport = async (format: "pdf" | "epub" | "txt" | "odt" | "doc" | "docx") => {
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format, readingMode }),
      });

      if (!response.ok) throw new Error("Error al exportar");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extensions: Record<string, string> = {
        pdf: "html",
        epub: "epub",
        txt: "txt",
        odt: "odt",
        doc: "doc",
        docx: "docx",
      };
      a.download = `${project?.title || "gamebook"}.${extensions[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting:", error);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("¿Seguro que quieres eliminar este proyecto? Esta acción no se puede deshacer.")) return;
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/projects");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleAutoFix = async () => {
    if (!project) return;
    setAutoFixing(true);
    try {
      const response = await fetch("/api/autofix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Auto-fix completado:\n` +
          `- Enlaces creados: ${result.linksCreated}\n` +
          `- Huérfanos arreglados: ${result.orphansFixed}\n` +
          `- Pasajes marcados como finales: ${result.endpointsMarked}\n` +
          `- Pasajes marcados como inicio: ${result.startsMarked}`
        );
        fetchProject();
      }
    } catch (error) {
      console.error("Error auto-fixing:", error);
    } finally {
      setAutoFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dungeon">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const errors = validatePassages(project.passages);

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Proyectos
        </Link>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary font-pixel flex items-center">
              <BookOpen className="w-8 h-8 mr-3" />
              {project.title}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={project.passages.length === 0}
            >
              <Eye className="w-4 h-4 mr-2" />
              Previsualizar
            </Button>

            <Button variant="outline" onClick={handleContentShuffle} disabled={project.passages.length < 2}>
              <Shuffle className="w-4 h-4 mr-2" />
              Barajar Contenido
            </Button>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none cursor-pointer" title="Preservar el pasaje marcado como inicio durante el barajado">
              <input
                type="checkbox"
                checked={preserveStart}
                onChange={(e) => setPreserveStart(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300"
              />
              Inicio fijo
            </label>

            <Button
              variant="outline"
              onClick={handleUndoShuffle}
              disabled={!canUndo}
              title="Deshacer último barajado"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Deshacer
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                disabled={project.passages.length === 0}
                onClick={() => setShowExportMenu(!showExportMenu)}
                onMouseEnter={() => setShowExportMenu(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              {showExportMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-50"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <div className="bg-card border border-border rounded-md shadow-lg py-1 min-w-[220px]">
                    <div className="px-4 py-2 border-b border-border">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={readingMode}
                          onChange={(e) => setReadingMode(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span>Lectura fluida</span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">Sin titulares por pasaje</p>
                    </div>
                    <button
                      onClick={() => { handleExport("pdf"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      PDF (HTML imprimible)
                    </button>
                    <button
                      onClick={() => { handleExport("epub"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      EPUB (e-book)
                    </button>
                    <button
                      onClick={() => { handleExport("txt"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                      TXT (texto plano)
                    </button>
                    <button
                      onClick={() => { handleExport("odt"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      ODT (OpenOffice)
                    </button>
                    <button
                      onClick={() => { handleExport("doc"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      Word (.doc)
                    </button>
                    <button
                      onClick={() => { handleExport("docx"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                      Word (.docx)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleAutoFix}
              disabled={autoFixing || project.passages.length === 0}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {autoFixing ? "Arreglando..." : "Auto-fix"}
            </Button>

            <Button variant="destructive" onClick={handleDeleteProject}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Pasajes ({project.passages.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const maxNumber = Math.max(0, ...project.passages.map(p => p.number));
                      const response = await fetch(`/api/projects/${projectId}/passages`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          number: maxNumber + 1,
                          title: "Nuevo Pasaje",
                          content: "Escribe el contenido aquí...",
                          isStart: project.passages.length === 0,
                          isEndpoint: false,
                        }),
                      });
                      if (response.ok) {
                        fetchProject();
                      }
                    }}
                  >
                    + Nuevo
                  </Button>
                  {project.passages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("¿Renumerar todos los pasajes secuencialmente (1, 2, 3...)?")) return;
                        const response = await fetch(`/api/projects/${projectId}/renumber`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ startFrom: 1, step: 1 }),
                        });
                        if (response.ok) {
                          fetchProject();
                        }
                      }}
                      title="Renumerar todos los pasajes desde 1"
                    >
                      1,2,3...
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <PassageList
                  passages={project.passages}
                  selectedPassageId={selectedPassage?.id}
                  onSelectPassage={(p) => setSelectedPassage(p as Passage)}
                  onReorder={fetchProject}
                  onRenumber={fetchProject}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <div className="flex space-x-1 mb-4">
              <Button
                variant={activeTab === "editor" ? "default" : "ghost"}
                onClick={() => setActiveTab("editor")}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Editor
              </Button>
              <Button
                variant={activeTab === "upload" ? "default" : "ghost"}
                onClick={() => setActiveTab("upload")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
              <Button
                variant={activeTab === "errors" ? "default" : "ghost"}
                onClick={() => setActiveTab("errors")}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Errores ({errors.length})
              </Button>
            </div>

            {activeTab === "editor" && (
              <Card>
                <CardContent className="p-6">
                  {selectedPassage ? (
                    <PassageEditor
                      key={selectedPassage.id}
                      passage={selectedPassage}
                      allPassages={project.passages}
                      onUpdate={handlePassageUpdate}
                      onDelete={() => handlePassageDelete(selectedPassage.id)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Selecciona un pasaje</h3>
                      <p className="text-muted-foreground">
                        Elige un pasaje de la lista para empezar a editar
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "upload" && (
              <Card>
                <CardHeader>
                  <CardTitle>Importar Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload projectId={projectId} onUploadComplete={fetchProject} />
                </CardContent>
              </Card>
            )}

            {activeTab === "errors" && (
              <ErrorPanel
                errors={errors}
                passages={project.passages}
                onAutoFix={handleAutoFix}
                autoFixing={autoFixing}
              />
            )}
          </div>
        </div>
      </main>

      {showPreview && (
        <PreviewMode
          project={project}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function validatePassages(passages: Passage[]): PassageError[] {
  const errors: PassageError[] = [];
  const numbers = passages.map(p => p.number);

  passages.forEach(passage => {
    // Check for broken links
    passage.outgoingLinks.forEach(link => {
      if (!numbers.includes(link.target.number)) {
        errors.push({
          type: "broken_link",
          passageNumber: passage.number,
          message: `Enlace roto hacia pasaje ${link.target.number} que no existe`,
          autoFixable: false,
        });
      }
    });

    // Check for orphan passages (no incoming links, not start)
    if (passage.incomingLinks.length === 0 && !passage.isStart && passages.length > 1) {
      errors.push({
        type: "orphan",
        passageNumber: passage.number,
        message: `Pasaje ${passage.number}: no tiene enlaces entrantes (huérfano)`,
        autoFixable: true,
      });
    }

    // Check for passages without outgoing links (endpoints)
    if (passage.outgoingLinks.length === 0 && !passage.isEndpoint) {
      errors.push({
        type: "no_exit",
        passageNumber: passage.number,
        message: `Pasaje ${passage.number}: no tiene enlaces salientes`,
        autoFixable: true,
      });
    }
  });

  return errors;
}
