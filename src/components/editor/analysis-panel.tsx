"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import {
  createConnectionFinder,
  createPassageDetector,
  type Connection,
  type AnalysisResult,
  type DetectedPassage,
} from "@/lib/agents";
import {
  Lock, Search, Lightbulb, ScanText, Wand2, CheckCircle2, AlertCircle,
} from "lucide-react";

interface PanelPassage {
  number: number;
  content: string;
  outgoingLinks: { target: { number: number } }[];
}

interface AnalysisPanelProps {
  projectId: string;
  passages: PanelPassage[];
  canAnalyze: boolean;
  onRequireUpgrade: (message: string) => void;
  onChanged: () => void;
}

type Status = { kind: "ok" | "error" | "info"; text: string } | null;

const TYPE_STYLES: Record<Connection["type"], string> = {
  explicit: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  implicit: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  suggested: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

function confidencePercent(conn: Connection): number {
  const raw =
    conn.type === "suggested"
      ? Math.round(conn.confidence * 200)
      : Math.round(conn.confidence * 100);
  return Math.min(99, Math.max(1, raw));
}

export function AnalysisPanel({
  projectId,
  passages,
  canAnalyze,
  onRequireUpgrade,
  onChanged,
}: AnalysisPanelProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<Connection[] | null>(null);
  const [detected, setDetected] = useState<DetectedPassage[] | null>(null);

  const existingPairs = new Set(
    passages.flatMap((p) =>
      p.outgoingLinks.map((l) => `${p.number}->${l.target.number}`)
    )
  );

  const handleUpgrade = async (response: Response, fallback: string): Promise<boolean> => {
    if (response.status === 402) {
      try {
        const data = await response.json();
        onRequireUpgrade(data.error || fallback);
      } catch {
        onRequireUpgrade(fallback);
      }
      return true;
    }
    return false;
  };

  const runConnections = () => {
    setBusy("connections");
    setStatus(null);
    try {
      const finder = createConnectionFinder();
      const result = finder.findConnections(
        passages.map((p) => ({ number: p.number, content: p.content }))
      );
      const fresh = result.connections.filter(
        (c) => !existingPairs.has(`${c.sourceNumber}->${c.targetNumber}`)
      );
      setAnalysis({ ...result, connections: fresh });
      setStatus(
        fresh.length === 0
          ? { kind: "info", text: t("Analysis.noConnections") }
          : null
      );
    } catch {
      setStatus({ kind: "error", text: t("Analysis.error") });
    } finally {
      setBusy(null);
    }
  };

  const runSuggestions = () => {
    setBusy("suggest");
    setStatus(null);
    try {
      const finder = createConnectionFinder();
      const all = finder.suggestConnections(
        passages.map((p) => ({ number: p.number, content: p.content }))
      );
      const fresh = all.filter(
        (c) => !existingPairs.has(`${c.sourceNumber}->${c.targetNumber}`)
      );
      setSuggestions(fresh);
      setStatus(
        fresh.length === 0
          ? { kind: "info", text: t("Analysis.noSuggestions") }
          : null
      );
    } catch {
      setStatus({ kind: "error", text: t("Analysis.error") });
    } finally {
      setBusy(null);
    }
  };

  const runDetect = async () => {
    setBusy("detect");
    setStatus(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/raw`);
      if (await handleUpgrade(response, t("Analysis.upgradeMsg"))) {
        setBusy(null);
        return;
      }
      if (!response.ok) {
        setStatus({ kind: "error", text: t("Analysis.error") });
        setBusy(null);
        return;
      }
      const data = await response.json();
      if (!data.rawContent) {
        setDetected(null);
        setStatus({ kind: "info", text: t("Analysis.noRaw") });
        setBusy(null);
        return;
      }
      const detector = createPassageDetector();
      const found = detector.detect(data.rawContent).filter((d) => d.content.trim().length > 0);
      setDetected(found);
      setStatus(
        found.length === 0 ? { kind: "info", text: t("Analysis.noDetected") } : null
      );
    } catch {
      setStatus({ kind: "error", text: t("Analysis.error") });
    } finally {
      setBusy(null);
    }
  };

  const applyConnections = async (links: Connection[]) => {
    if (links.length === 0) return;
    setBusy("apply");
    setStatus(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          links: links.map((c) => ({
            sourceNumber: c.sourceNumber,
            targetNumber: c.targetNumber,
            text: c.type === "suggested" ? undefined : c.text,
          })),
        }),
      });
      if (await handleUpgrade(response, t("Analysis.upgradeMsg"))) {
        setBusy(null);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", text: data.error || t("Analysis.error") });
        setBusy(null);
        return;
      }
      setStatus({
        kind: "ok",
        text: `${t("Analysis.applied")} ${data.created} · ${t("Analysis.skippedInfo")} ${data.skipped}`,
      });
      if (data.created > 0) {
        const createdPairs = new Set(
          links.map((c) => `${c.sourceNumber}->${c.targetNumber}`)
        );
        if (analysis) {
          setAnalysis({
            ...analysis,
            connections: analysis.connections.filter(
              (c) => !createdPairs.has(`${c.sourceNumber}->${c.targetNumber}`)
            ),
          });
        }
        if (suggestions) {
          setSuggestions(
            suggestions.filter(
              (c) => !createdPairs.has(`${c.sourceNumber}->${c.targetNumber}`)
            )
          );
        }
        onChanged();
      }
    } catch {
      setStatus({ kind: "error", text: t("Analysis.error") });
    } finally {
      setBusy(null);
    }
  };

  const applyDetection = async () => {
    if (!window.confirm(t("Analysis.confirmReplace"))) return;
    setBusy("applyDetection");
    setStatus(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (await handleUpgrade(response, t("Analysis.upgradeMsg"))) {
        setBusy(null);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", text: data.error || t("Analysis.error") });
        setBusy(null);
        return;
      }
      setStatus({
        kind: "ok",
        text: `${t("Analysis.detectionApplied")} ${data.passageCount}`,
      });
      setDetected(null);
      onChanged();
    } catch {
      setStatus({ kind: "error", text: t("Analysis.error") });
    } finally {
      setBusy(null);
    }
  };

  if (!canAnalyze) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            {t("Analysis.lockMsg")}
          </p>
          <Button
            onClick={() => onRequireUpgrade(t("Analysis.upgradeMsg"))}
            size="sm"
          >
            {t("Analysis.upgradeBtn")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const strongSuggestions =
    suggestions?.filter((c) => c.confidence >= 0.35) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Analysis.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("Analysis.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={runConnections} disabled={busy !== null}>
            <Search className="w-3.5 h-3.5 mr-1.5" />
            {busy === "connections" ? t("Analysis.analyzing") : t("Analysis.findConnections")}
          </Button>
          <Button size="sm" variant="outline" onClick={runSuggestions} disabled={busy !== null}>
            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
            {busy === "suggest" ? t("Analysis.analyzing") : t("Analysis.suggest")}
          </Button>
          <Button size="sm" variant="outline" onClick={runDetect} disabled={busy !== null}>
            <ScanText className="w-3.5 h-3.5 mr-1.5" />
            {busy === "detect" ? t("Analysis.analyzing") : t("Analysis.detect")}
          </Button>
        </div>

        {status && (
          <p
            className={
              "text-xs flex items-center gap-1.5 " +
              (status.kind === "ok"
                ? "text-green-600 dark:text-green-400"
                : status.kind === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground")
            }
          >
            {status.kind === "ok" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : status.kind === "error" ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : null}
            {status.text}
          </p>
        )}

        {analysis && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-muted">
                {analysis.connections.length} {t("Analysis.statConnections")}
              </span>
              <span className="px-2 py-0.5 rounded bg-muted">
                {analysis.orphanPassages.length} {t("Analysis.statOrphans")}
              </span>
              <span className="px-2 py-0.5 rounded bg-muted">
                {analysis.deadEnds.length} {t("Analysis.statDeadEnds")}
              </span>
              <span className="px-2 py-0.5 rounded bg-muted">
                {analysis.cycles.length} {t("Analysis.statCycles")}
              </span>
            </div>
            {analysis.connections.length > 0 && (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {analysis.connections.map((conn) => (
                  <div
                    key={`${conn.sourceNumber}-${conn.targetNumber}-${conn.type}`}
                    className="flex items-center gap-2 text-xs border rounded px-2 py-1.5"
                  >
                    <span className="font-mono font-semibold">
                      {conn.sourceNumber} → {conn.targetNumber}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${TYPE_STYLES[conn.type]}`}>
                      {t(`Analysis.type_${conn.type}`)}
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {confidencePercent(conn)}%
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      disabled={busy !== null}
                      onClick={() => applyConnections([conn])}
                    >
                      {t("Analysis.apply")}
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={busy !== null}
                  onClick={() => applyConnections(analysis.connections)}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  {t("Analysis.applyAll")}
                </Button>
              </div>
            )}
          </div>
        )}

        {suggestions !== null && suggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium">{t("Analysis.suggestionsTitle")}</p>
            <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
              {suggestions.map((conn) => (
                <div
                  key={`${conn.sourceNumber}-${conn.targetNumber}`}
                  className="flex items-center gap-2 text-xs border rounded px-2 py-1.5"
                >
                  <span className="font-mono font-semibold">
                    {conn.sourceNumber} → {conn.targetNumber}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${TYPE_STYLES[conn.type]}`}>
                    {t(`Analysis.type_${conn.type}`)}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {confidencePercent(conn)}%
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    disabled={busy !== null}
                    onClick={() => applyConnections([conn])}
                  >
                    {t("Analysis.apply")}
                  </Button>
                </div>
              ))}
            </div>
            {strongSuggestions.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                disabled={busy !== null}
                onClick={() => applyConnections(strongSuggestions)}
              >
                <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                {t("Analysis.applyAll")}
              </Button>
            )}
          </div>
        )}

        {detected !== null && detected.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              {t("Analysis.detectedTitle")} ({detected.length})
            </p>
            <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
              {detected.map((seg, i) => (
                <div key={i} className="text-xs border rounded px-2 py-1.5 flex items-center gap-2">
                  <span className="font-mono font-semibold shrink-0">#{i + 1}</span>
                  <span className="truncate text-muted-foreground">
                    {seg.content.split("\n")[0]?.slice(0, 90)}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {Math.round(seg.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              disabled={busy !== null}
              onClick={applyDetection}
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
              {busy === "applyDetection" ? t("Analysis.analyzing") : t("Analysis.applyDetection")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
