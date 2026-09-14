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
import { ArrowLeft, Upload, BookOpen, AlertTriangle, Shuffle, Download } from "lucide-react";
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

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"editor" | "upload" | "errors">("editor");

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

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handlePassageUpdate = async (updatedPassage: Partial<Passage>) => {
    if (!selectedPassage) return;

    try {
      const response = await fetch(`/api/passages/${selectedPassage.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
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
      const response = await fetch(`/api/passages/${passageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSelectedPassage(null);
        fetchProject();
      }
    } catch (error) {
      console.error("Error deleting passage:", error);
    }
  };

  const handleShuffle = async () => {
    if (!project) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/shuffle`, {
        method: "POST",
      });

      if (response.ok) {
        fetchProject();
      }
    } catch (error) {
      console.error("Error shuffling passages:", error);
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

  if (!project) {
    return null;
  }

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
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleShuffle} disabled={project.passages.length === 0}>
              <Shuffle className="w-4 h-4 mr-2" />
              Reordenar
            </Button>
            <Button disabled={project.passages.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pasajes ({project.passages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <PassageList
                  passages={project.passages}
                  selectedPassageId={selectedPassage?.id}
                  onSelectPassage={(p) => setSelectedPassage(p as Passage)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
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
                      passage={selectedPassage}
                      allPassages={project.passages}
                      onUpdate={handlePassageUpdate}
                      onDelete={() => handlePassageDelete(selectedPassage.id)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">
                        Selecciona un pasaje
                      </h3>
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
                  <FileUpload
                    projectId={projectId}
                    onUploadComplete={fetchProject}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === "errors" && (
              <ErrorPanel errors={errors} passages={project.passages} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function validatePassages(passages: Passage[]): string[] {
  const errors: string[] = [];
  const numbers = passages.map(p => p.number);

  passages.forEach(passage => {
    // Check for broken links
    passage.outgoingLinks.forEach(link => {
      if (!numbers.includes(link.target.number)) {
        errors.push(
          `Pasaje ${passage.number}: enlace roto hacia pasaje ${link.target.number} que no existe`
        );
      }
    });

    // Check for orphan passages (no incoming links, not start)
    if (
      passage.incomingLinks.length === 0 &&
      !passage.isStart &&
      passages.length > 1
    ) {
      errors.push(
        `Pasaje ${passage.number}: no tiene enlaces entrantes (huérfano)`
      );
    }

    // Check for passages without outgoing links (endpoints)
    if (passage.outgoingLinks.length === 0 && !passage.isEndpoint) {
      errors.push(
        `Pasaje ${passage.number}: no tiene enlaces salientes (¿es un final?)`
      );
    }
  });

  // Check for cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(passageId: string): boolean {
    visited.add(passageId);
    recursionStack.add(passageId);

    const passage = passages.find(p => p.id === passageId);
    if (passage) {
      for (const link of passage.outgoingLinks) {
        if (!visited.has(link.targetId)) {
          if (hasCycle(link.targetId)) return true;
        } else if (recursionStack.has(link.targetId)) {
          return true;
        }
      }
    }

    recursionStack.delete(passageId);
    return false;
  }

  passages.forEach(passage => {
    if (!visited.has(passage.id)) {
      if (hasCycle(passage.id)) {
        errors.push("Se detectó un ciclo en los enlaces entre pasajes");
      }
    }
  });

  return errors;
}
