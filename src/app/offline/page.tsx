"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  CachedProjectSummary,
  getCachedProject,
  listCachedProjects,
  removeCachedProject,
} from "@/lib/offline-cache";
import {
  downloadText,
  safeFilename,
  snapshotToJSON,
  snapshotToMarkdown,
} from "@/lib/offline-export";
import { BookOpen, Download, Trash2, WifiOff } from "lucide-react";

export default function OfflinePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<CachedProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCachedProjects()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportProject = async (id: string, format: "json" | "md") => {
    setError(null);
    try {
      const snapshot = await getCachedProject(id);
      if (!snapshot) {
        setError(t("Offline.notFound"));
        return;
      }
      const name = safeFilename(snapshot.title);
      if (format === "json") {
        downloadText(`${name}.json`, snapshotToJSON(snapshot), "application/json");
      } else {
        downloadText(`${name}.md`, snapshotToMarkdown(snapshot), "text/markdown");
      }
    } catch {
      setError(t("Offline.exportError"));
    }
  };

  const deleteProject = (item: CachedProjectSummary) => {
    if (!window.confirm(t("Offline.deleteConfirm"))) return;
    removeCachedProject(item.id)
      .then(() => setItems((prev) => (prev ? prev.filter((p) => p.id !== item.id) : prev)))
      .catch(() => setError(t("Offline.deleteError")));
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <WifiOff className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold font-medieval">{t("Offline.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{t("Offline.subtitle")}</p>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {items === null ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border border-dashed rounded-lg">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="mb-1">{t("Offline.empty")}</p>
            <p className="text-xs">{t("Offline.emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 p-4 rounded-md bg-muted/50 border border-border"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Offline.passages", { n: item.passageCount })} ·{" "}
                    {t("Offline.saved")} {new Date(item.savedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => router.push(`/offline/${item.id}`)}>
                    <BookOpen className="w-4 h-4 mr-1" />
                    {t("Offline.read")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={t("Offline.exportJson")}
                    onClick={() => void exportProject(item.id, "json")}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {t("Offline.exportJson")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={t("Offline.exportMd")}
                    onClick={() => void exportProject(item.id, "md")}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {t("Offline.exportMd")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title={t("Offline.delete")}
                    onClick={() => deleteProject(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
