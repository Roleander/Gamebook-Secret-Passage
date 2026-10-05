"use client";

import { useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getCachedProject } from "@/lib/offline-cache";
import { findPassageLinks } from "@/lib/reference-links";
import {
  OfflineProjectSnapshot,
  findPassage,
  startPassageNumber,
} from "@/lib/offline-snapshot";
import { ArrowLeft, ArrowUp, RotateCcw, WifiOff } from "lucide-react";

function linkifyContent(
  content: string,
  passageNumbers: Set<number>,
  currentNumber: number,
  onNavigate: (n: number) => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  const links = findPassageLinks(content, passageNumbers, currentNumber);
  let lastIndex = 0;
  let key = 0;

  for (const link of links) {
    if (link.start > lastIndex) {
      parts.push(content.slice(lastIndex, link.start));
    }
    const target = link.target;
    parts.push(
      <button
        key={`link-${key++}`}
        type="button"
        className="text-primary underline underline-offset-2 hover:opacity-80"
        onClick={() => onNavigate(target)}
      >
        {link.text}
      </button>
    );
    lastIndex = link.end;
  }
  parts.push(content.slice(lastIndex));
  return parts;
}

export default function OfflineReaderPage() {
  const params = useParams();
  const { t } = useI18n();
  const projectId = params.projectId as string;

  const [snapshot, setSnapshot] = useState<OfflineProjectSnapshot | null | undefined>(
    undefined
  );
  const [current, setCurrent] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    getCachedProject(projectId)
      .then((cached) => {
        if (cancelled) return;
        setSnapshot(cached);
        if (cached) setCurrent(startPassageNumber(cached));
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const goTo = (number: number) => {
    if (current === null || current === number) return;
    setHistory((h) => [...h, current]);
    setCurrent(number);
  };

  const goBack = () => {
    if (history.length === 0) return;
    setCurrent(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  };

  const restart = () => {
    if (!snapshot) return;
    setHistory([]);
    setCurrent(startPassageNumber(snapshot));
  };

  if (snapshot === undefined) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </main>
      </>
    );
  }

  if (snapshot === null) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center">
          <WifiOff className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <p className="mb-4">{t("Offline.notFound")}</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("Offline.back")}
          </Button>
        </main>
      </>
    );
  }

  const passage = current !== null ? findPassage(snapshot, current) : null;
  const passageNumbers = new Set(snapshot.passages.map((p) => p.number));

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-medieval">{snapshot.title}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("Offline.back")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          {t("Offline.subtitleLocal")}
        </p>

        {passage ? (
          <article className="border border-border rounded-lg p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-primary">
                {t("Offline.passage", { n: passage.number })}
                {passage.title ? ` — ${passage.title}` : ""}
              </p>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t("Offline.prev")}
                </Button>
              )}
            </div>

            <div className="whitespace-pre-wrap leading-relaxed mb-6">
              {linkifyContent(passage.content, passageNumbers, passage.number, goTo)}
            </div>

            {passage.links.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                {passage.links.map((link, i) => {
                  const targetExists = passageNumbers.has(link.targetNumber);
                  return (
                    <Button
                      key={`${link.targetNumber}-${i}`}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={!targetExists || link.targetNumber === passage.number}
                      onClick={() => goTo(link.targetNumber)}
                    >
                      <ArrowUp className="w-4 h-4 mr-2 rotate-90" />
                      {link.linkText || t("Offline.continueTo", { n: link.targetNumber })}
                    </Button>
                  );
                })}
              </div>
            )}

            {passage.isEndpoint && (
              <div className="border-t border-border pt-4 text-center space-y-3">
                <p className="text-sm font-medium text-destructive">{t("Offline.end")}</p>
                <Button onClick={restart}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t("Offline.restart")}
                </Button>
              </div>
            )}
          </article>
        ) : (
          <p className="text-destructive">{t("Offline.notFound")}</p>
        )}
      </main>
    </>
  );
}
