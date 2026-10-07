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
import { AnalysisPanel } from "@/components/editor/analysis-panel";
import { PreviewMode } from "@/components/editor/preview-mode";
import { PassageGraph } from "@/components/editor/passage-graph";
import { ReviewPanel } from "@/components/editor/review-panel";
import { UpgradeModal } from "@/components/upgrade-modal";
import {
  ArrowLeft, Upload, BookOpen, AlertTriangle, Shuffle, Download,
  Trash2, Wand2, ChevronDown, Eye, Lock, LineChart, Network, ListChecks
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cacheProject, getEditorProject, saveEditorProject } from "@/lib/offline-cache";
import { toOfflineSnapshot } from "@/lib/offline-snapshot";
import { queueableFetch } from "@/lib/offline-client";
import { replayQueue } from "@/lib/offline-queue";
import { OfflineSyncIndicator } from "@/components/editor/offline-sync-indicator";
  import { HistoryPanel } from "@/components/editor/history-panel";

interface Entitlements {
  plan: string;
  isPro: boolean;
  maxProjects: number | null;
  maxPassages: number | null;
  features: {
    exportTxt: boolean;
    exportAdvanced: boolean;
    autofix: boolean;
    analyze: boolean;
    shuffle: boolean;
  };
}

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
  const { t } = useI18n();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"editor" | "upload" | "analysis" | "graph" | "review" | "errors">("editor");
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const [autoFixing, setAutoFixing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [readingMode, setReadingMode] = useState(true);
  const [preserveStart, setPreserveStart] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const locked = ents !== null && !ents.isPro;

  const fetchEntitlements = useCallback(async () => {
    try {
      const response = await fetch("/api/entitlements");
      if (response.ok) {
        setEnts(await response.json());
      }
    } catch {
      // server still enforces on every request
    }
  }, []);

  const handleUpgradeResponse = async (response: Response): Promise<boolean> => {
    if (response.status === 402) {
      try {
        const data = await response.json();
        setUpgradeMsg(data.error || "");
      } catch {
        setUpgradeMsg("");
      }
      return true;
    }
    return false;
  };

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        cacheProject(toOfflineSnapshot(data)).catch(() => {});
        saveEditorProject(data).catch(() => {});
      } else {
        router.push("/projects");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      const cached = await getEditorProject<Project>(projectId).catch(() => null);
      if (cached) {
        setProject(cached);
      } else {
        router.push("/offline");
      }
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

  const fetchPendingSuggestions = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/suggestions?status=pending`);
      if (response.ok) {
        const data = await response.json();
        setPendingSuggestions(Array.isArray(data.suggestions) ? data.suggestions.length : 0);
      }
    } catch {
      // badge stays at last known value
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchSnapshots();
    fetchEntitlements();
    fetchPendingSuggestions();
  }, [fetchProject, fetchSnapshots, fetchEntitlements, fetchPendingSuggestions]);

  // Sync selectedPassage when project data changes (e.g., after shuffle)
  useEffect(() => {
    if (project && selectedPassage) {
      const updated = project.passages.find((p) => p.id === selectedPassage.id);
      if (updated && updated !== selectedPassage) {
        setSelectedPassage(updated);
      }
    }
  }, [project, selectedPassage]);

  // Replay queued offline mutations when online (on load and on reconnect)
  useEffect(() => {
    let cancelled = false;
    const runReplay = () => {
      replayQueue()
        .then((result) => {
          if (cancelled) return;
          if (result.synced > 0 || result.dropped > 0) fetchProject();
          if (result.dropped > 0) {
            alert(t("Offline.syncDropped", { n: result.dropped }));
          }
        })
        .catch(() => {});
    };
    if (navigator.onLine) runReplay();
    window.addEventListener("online", runReplay);
    return () => {
      cancelled = true;
      window.removeEventListener("online", runReplay);
    };
  }, [fetchProject, t]);

  const handlePassageUpdate = async (updatedPassage: Partial<Passage>) => {
    if (!selectedPassage) return;
    const result = await queueableFetch(`/api/passages/${selectedPassage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPassage),
    });
    if (result.queued) {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              passages: prev.passages.map((p) =>
                p.id === selectedPassage.id ? { ...p, ...updatedPassage } : p
              ),
            }
          : prev
      );
    } else if (result.ok) {
      fetchProject();
    }
  };

  const handlePassageDelete = async (passageId: string) => {
    const result = await queueableFetch(`/api/passages/${passageId}`, {
      method: "DELETE",
    });
    if (result.queued) {
      setSelectedPassage(null);
      setProject((prev) =>
        prev
          ? { ...prev, passages: prev.passages.filter((p) => p.id !== passageId) }
          : prev
      );
    } else if (result.ok) {
      setSelectedPassage(null);
      fetchProject();
    }
  };

  const handleLinkAction = async (
    action:
      | { type: "create"; sourceId: string; targetId: string; linkText: string }
      | { type: "delete"; sourceId: string; targetId: string }
  ): Promise<boolean> => {
    if (!project) return false;
    if (action.type === "create") {
      const result = await queueableFetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: action.sourceId,
          targetId: action.targetId,
          linkText: action.linkText,
        }),
      });
      if (!result.ok) return false;
      const source = project.passages.find((p) => p.id === action.sourceId);
      const target = project.passages.find((p) => p.id === action.targetId);
      if (source && target) {
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            passages: prev.passages.map((p) => {
              if (p.id === action.sourceId) {
                if (p.outgoingLinks.some((l) => l.targetId === action.targetId)) return p;
                return {
                  ...p,
                  outgoingLinks: [
                    ...p.outgoingLinks,
                    { targetId: action.targetId, target: { number: target.number } },
                  ],
                };
              }
              if (p.id === action.targetId) {
                if (p.incomingLinks.some((l) => l.sourceId === action.sourceId)) return p;
                return {
                  ...p,
                  incomingLinks: [
                    ...p.incomingLinks,
                    { sourceId: action.sourceId, source: { number: source.number } },
                  ],
                };
              }
              return p;
            }),
          };
        });
      }
      if (!result.queued) fetchProject();
      return true;
    }
    const result = await queueableFetch(
      `/api/links?sourceId=${encodeURIComponent(action.sourceId)}&targetId=${encodeURIComponent(action.targetId)}`,
      { method: "DELETE" }
    );
    if (!result.ok) return false;
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        passages: prev.passages.map((p) => {
          if (p.id === action.sourceId) {
            return { ...p, outgoingLinks: p.outgoingLinks.filter((l) => l.targetId !== action.targetId) };
          }
          if (p.id === action.targetId) {
            return { ...p, incomingLinks: p.incomingLinks.filter((l) => l.sourceId !== action.sourceId) };
          }
          return p;
        }),
      };
    });
    if (!result.queued) fetchProject();
    return true;
  };

  const handleContentShuffle = async () => {
    if (!project) return;
    if (ents && !ents.features.shuffle) {
      setUpgradeMsg("");
      return;
    }
    if (!confirm(t("Shuffle.confirm"))) return;
    setShuffling(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/content-shuffle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preserveStart }),
      });
      const result = await response.json();
      if (response.ok) {
        alert(
          t("Shuffle.done", { p: result.passageCount, l: result.linksCreated }) +
            (result.startPreserved ? t("Shuffle.startPreserved") : "")
        );
        await fetchProject();
        fetchSnapshots();
      } else if (await handleUpgradeResponse(response)) {
        // upgrade modal shown
      } else {
        alert(`Error: ${result.error || t("Shuffle.error")}`);
      }
    } catch (error) {
      console.error("Error shuffling content:", error);
      alert(t("Shuffle.connError"));
    } finally {
      setShuffling(false);
    }
  };

  const handleUndoShuffle = async () => {
    if (!project) return;
    if (ents && !ents.features.shuffle) {
      setUpgradeMsg("");
      return;
    }
    if (!confirm(t("Shuffle.confirmUndo"))) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/content-shuffle/undo`, {
        method: "POST",
      });
      const result = await response.json();
      if (response.ok) {
        alert(
          t("Shuffle.undoDone", {
            p: result.passageCount,
            l: result.linksRestored,
          })
        );
        fetchProject();
        fetchSnapshots();
      } else if (await handleUpgradeResponse(response)) {
        // upgrade modal shown
      } else {
        alert(`Error: ${result.error || t("Shuffle.undoError")}`);
      }
    } catch (error) {
      console.error("Error undoing shuffle:", error);
      alert(t("Shuffle.undoConnError"));
    }
  };

  const handleExport = async (format: "pdf" | "epub" | "txt" | "odt" | "doc" | "docx") => {
    if (format !== "txt" && ents && !ents.features.exportAdvanced) {
      setUpgradeMsg("");
      return;
    }
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format, readingMode }),
      });

      if (!response.ok) {
        if (await handleUpgradeResponse(response)) return;
        throw new Error("Error al exportar");
      }

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
    if (!confirm(t("Editor.deleteProjectConfirm"))) return;
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
    if (ents && !ents.features.autofix) {
      setUpgradeMsg("");
      return;
    }
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
          t("Editor.autoFixDone", {
            a: result.linksCreated,
            b: result.orphansFixed,
            c: result.endpointsMarked,
            d: result.startsMarked,
          })
        );
        fetchProject();
      } else {
        await handleUpgradeResponse(response);
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

  const errors = validatePassages(project.passages, t);

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("Editor.backToProjects")}
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
            <OfflineSyncIndicator />
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={project.passages.length === 0}
            >
              <Eye className="w-4 h-4 mr-2" />
              {t("Editor.preview")}
            </Button>

            <Button variant="outline" onClick={handleContentShuffle} disabled={project.passages.length < 2 || shuffling}>
              <Shuffle className={`w-4 h-4 mr-2 ${shuffling ? "animate-spin" : ""}`} />
              {shuffling ? t("Editor.shuffling") : t("Editor.shuffle")}
              {locked && !ents?.features.shuffle && <Lock className="w-3 h-3 ml-2 text-primary/70" />}
            </Button>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none cursor-pointer" title={t("Editor.keepStartTitle")}>
              <input
                type="checkbox"
                checked={preserveStart}
                onChange={(e) => setPreserveStart(e.target.checked)}
                className="w-3 h-3 rounded border-gray-300"
              />
              {t("Editor.fixedStart")}
            </label>

            <Button
              variant="outline"
              onClick={handleUndoShuffle}
              disabled={!canUndo}
              title={t("Editor.undoShuffleTitle")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("Editor.undo")}
            </Button>

            <HistoryPanel
              projectId={projectId}
              isPro={Boolean(ents?.isPro)}
              onRequireUpgrade={(msg) => setUpgradeMsg(msg)}
              onChanged={() => { fetchProject(); fetchSnapshots(); }}
            />
            <div className="relative">
              <Button
                variant="outline"
                disabled={project.passages.length === 0}
                onClick={() => setShowExportMenu(!showExportMenu)}
                onMouseEnter={() => setShowExportMenu(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                {t("Editor.export")}
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
                        <span>{t("Editor.readingMode")}</span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">{t("Editor.readingModeHint")}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">{t("Editor.exportLinksHint")}</p>
                    </div>
                    <button
                      onClick={() => { handleExport("pdf"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      {t("Editor.exportPdf")}
                      {locked && !ents?.features.exportAdvanced && <Lock className="w-3 h-3 ml-auto text-primary/70" />}
                    </button>
                    <button
                      onClick={() => { handleExport("epub"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      EPUB (e-book)
                      {locked && !ents?.features.exportAdvanced && <Lock className="w-3 h-3 ml-auto text-primary/70" />}
                    </button>
                    <button
                      onClick={() => { handleExport("txt"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                      {t("Editor.exportTxt")}
                    </button>
                    <button
                      onClick={() => { handleExport("odt"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {t("Editor.exportOdt")}
                      {locked && !ents?.features.exportAdvanced && <Lock className="w-3 h-3 ml-auto text-primary/70" />}
                    </button>
                    <button
                      onClick={() => { handleExport("doc"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      Word (.doc)
                      {locked && !ents?.features.exportAdvanced && <Lock className="w-3 h-3 ml-auto text-primary/70" />}
                    </button>
                    <button
                      onClick={() => { handleExport("docx"); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center"
                    >
                      <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                      Word (.docx)
                      {locked && !ents?.features.exportAdvanced && <Lock className="w-3 h-3 ml-auto text-primary/70" />}
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
              {autoFixing ? t("Editor.autoFixing") : t("Editor.autoFix")}
              {locked && !ents?.features.autofix && <Lock className="w-3 h-3 ml-2 text-primary/70" />}
            </Button>

            <Button variant="destructive" onClick={handleDeleteProject}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("Editor.delete")}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {t("Editor.passages", { n: project.passages.length })}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const maxNumber = Math.max(0, ...project.passages.map(p => p.number));
                      const payload = {
                        number: maxNumber + 1,
                        title: t("Editor.newPassageTitle"),
                        content: t("Editor.newPassageContent"),
                        isStart: project.passages.length === 0,
                        isEndpoint: false,
                      };
                      const result = await queueableFetch(
                        `/api/projects/${projectId}/passages`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        },
                        { syntheticPassage: true }
                      );
                      if (result.response && (await handleUpgradeResponse(result.response))) return;
                      if (result.queued && result.syntheticId) {
                        const localPassage: Passage = {
                          id: result.syntheticId,
                          ...payload,
                          sortOrder: payload.number,
                          outgoingLinks: [],
                          incomingLinks: [],
                        };
                        setProject((prev) =>
                          prev
                            ? { ...prev, passages: [...prev.passages, localPassage] }
                            : prev
                        );
                        setSelectedPassage(localPassage);
                      } else if (result.ok) {
                        fetchProject();
                      }
                    }}
                  >
                    {t("Editor.newButton")}
                  </Button>
                  {project.passages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (ents && !ents.features.shuffle) {
                          setUpgradeMsg("");
                          return;
                        }
                        if (!confirm(t("Editor.renumberConfirm"))) return;
                        const response = await fetch(`/api/projects/${projectId}/renumber`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ startFrom: 1, step: 1 }),
                        });
                        if (await handleUpgradeResponse(response)) return;
                        if (response.ok) {
                          fetchProject();
                        }}
                      }
                      title={t("Editor.renumberTitle")}
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
                {t("Editor.tabEditor")}
              </Button>
              <Button
                variant={activeTab === "upload" ? "default" : "ghost"}
                onClick={() => setActiveTab("upload")}
              >
                <Upload className="w-4 h-4 mr-2" />
                {t("Editor.tabImport")}
              </Button>
              <Button
                variant={activeTab === "analysis" ? "default" : "ghost"}
                onClick={() => setActiveTab("analysis")}
              >
                <LineChart className="w-4 h-4 mr-2" />
                {t("Analysis.tab")}
              </Button>
              <Button
                variant={activeTab === "graph" ? "default" : "ghost"}
                onClick={() => setActiveTab("graph")}
              >
                <Network className="w-4 h-4 mr-2" />
                {t("Graph.tab")}
              </Button>
              <Button
                variant={activeTab === "review" ? "default" : "ghost"}
                onClick={() => setActiveTab("review")}
              >
                <ListChecks className="w-4 h-4 mr-2" />
                {t("Review.tab")}
                {pendingSuggestions > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary text-primary-foreground">
                    {pendingSuggestions}
                  </span>
                )}
              </Button>
              <Button
                variant={activeTab === "errors" ? "default" : "ghost"}
                onClick={() => setActiveTab("errors")}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t("Editor.tabErrors", { n: errors.length })}
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
                      onLinkAction={handleLinkAction}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">{t("Editor.selectPassage")}</h3>
                      <p className="text-muted-foreground">
                        {t("Editor.selectPassageHint")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "upload" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Editor.importTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload projectId={projectId} onUploadComplete={fetchProject} />
                </CardContent>
              </Card>
            )}

            {activeTab === "analysis" && (
              <AnalysisPanel
                projectId={projectId}
                passages={project.passages}
                canAnalyze={Boolean(ents?.features.analyze)}
                onRequireUpgrade={(msg) => setUpgradeMsg(msg)}
                onChanged={() => {
                  fetchProject();
                  fetchPendingSuggestions();
                }}
              />
            )}

            {activeTab === "graph" && (
              <Card>
                <CardContent className="p-6">
                  <PassageGraph
                    passages={project.passages}
                    selectedPassageId={selectedPassage?.id}
                    onSelect={(gp) => {
                      const passage = project.passages.find((p) => p.id === gp.id);
                      if (passage) {
                        setSelectedPassage(passage);
                        setActiveTab("editor");
                      }
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === "review" && (
              <ReviewPanel
                projectId={projectId}
                onChanged={() => {
                  fetchProject();
                  fetchPendingSuggestions();
                }}
                onOpenPassage={(number) => {
                  const passage = project.passages.find((p) => p.number === number);
                  if (passage) {
                    setSelectedPassage(passage);
                    setActiveTab("editor");
                  }
                }}
              />
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

      {upgradeMsg !== null && (
        <UpgradeModal
          message={upgradeMsg}
          onClose={() => setUpgradeMsg(null)}
        />
      )}
    </div>
  );
}

type TFunction = (key: string, params?: Record<string, string | number>) => string;

function validatePassages(passages: Passage[], t: TFunction): PassageError[] {
  const errors: PassageError[] = [];
  const numbers = passages.map(p => p.number);

  passages.forEach(passage => {
    // Check for broken links
    passage.outgoingLinks.forEach(link => {
      if (!numbers.includes(link.target.number)) {
        errors.push({
          type: "broken_link",
          passageNumber: passage.number,
          message: t("Editor.brokenLink", { n: link.target.number }),
          autoFixable: false,
        });
      }
    });

    // Check for orphan passages (no incoming links, not start)
    if (passage.incomingLinks.length === 0 && !passage.isStart && passages.length > 1) {
      errors.push({
        type: "orphan",
        passageNumber: passage.number,
        message: t("Editor.orphan", { n: passage.number }),
        autoFixable: true,
      });
    }

    // Check for passages without outgoing links (endpoints)
    if (passage.outgoingLinks.length === 0 && !passage.isEndpoint) {
      errors.push({
        type: "no_exit",
        passageNumber: passage.number,
        message: t("Editor.noExit", { n: passage.number }),
        autoFixable: true,
      });
    }
  });

  return errors;
}
