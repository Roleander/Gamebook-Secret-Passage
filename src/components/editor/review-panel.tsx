"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ExternalLink, ListChecks } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface ReviewSuggestion {
  id: string;
  sourceNumber: number;
  targetNumber: number;
  type: string;
  text: string | null;
  confidence: number;
  status: string;
}

interface ReviewPanelProps {
  projectId: string;
  onChanged: () => void;
  onOpenPassage?: (passageNumber: number) => void;
}

const TYPE_KEY: Record<string, string> = {
  explicit: "Review.explicit",
  implicit: "Review.implicit",
  suggested: "Review.suggested",
};

const TYPE_CLASS: Record<string, string> = {
  explicit: "bg-green-500/15 text-green-600 dark:text-green-400",
  implicit: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  suggested: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

export function ReviewPanel({ projectId, onChanged, onOpenPassage }: ReviewPanelProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<ReviewSuggestion[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/suggestions?status=pending`)
      .then((response) => (response.ok ? response.json() : { suggestions: [] }))
      .then((data) => {
        if (!cancelled) {
          setItems(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const resolve = async (id: string, action: "accept" | "reject") => {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || t("Review.error"));
        return;
      }
      setItems((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      if (action === "accept") onChanged();
    } catch {
      setError(t("Review.error"));
    } finally {
      setBusyId(null);
    }
  };

  const bulkResolve = async (action: "accept" | "reject") => {
    setBulkBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/suggestions/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || t("Review.error"));
        return;
      }
      setItems([]);
      if (action === "accept") onChanged();
    } catch {
      setError(t("Review.error"));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center">
            <ListChecks className="w-5 h-5 mr-2 text-primary" />
            {t("Review.tab")} ({items?.length ?? 0})
          </CardTitle>
          {items !== null && items.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => void bulkResolve("accept")}
              >
                <Check className="w-4 h-4 mr-1" />
                {t("Analysis.applyAll")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={bulkBusy}
                onClick={() => void bulkResolve("reject")}
              >
                <X className="w-4 h-4 mr-1" />
                {t("Review.rejectAll")}
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t("Review.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive mb-3">{error}</p>
        )}

        {items === null ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Check className="w-10 h-10 mx-auto mb-3 text-green-500" />
            <p>{t("Review.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-2 min-w-[160px]">
                  <span className="font-mono text-sm font-bold">
                    #{s.sourceNumber} → #{s.targetNumber}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${TYPE_CLASS[s.type] || TYPE_CLASS.suggested}`}
                  >
                    {t(TYPE_KEY[s.type] || "Review.suggested")}
                  </span>
                  {s.confidence > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {t("Review.confidence", { n: Math.round(s.confidence * 100) })}
                    </span>
                  )}
                </div>

                {s.text && (
                  <span className="text-xs text-muted-foreground flex-1 truncate max-w-[280px]">
                    {s.text}
                  </span>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  {onOpenPassage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title={t("Review.goTo")}
                      onClick={() => onOpenPassage(s.sourceNumber)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === s.id}
                    onClick={() => void resolve(s.id, "accept")}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {t("Review.accept")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === s.id}
                    onClick={() => void resolve(s.id, "reject")}
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t("Review.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
