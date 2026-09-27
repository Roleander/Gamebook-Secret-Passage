"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Flag, Target, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: {
    targetId: string;
    target: { number: number };
    linkText?: string | null;
  }[];
  incomingLinks: {
    sourceId: string;
    source: { number: number };
  }[];
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  passages: Passage[];
}

interface PreviewModeProps {
  project: Project;
  onClose: () => void;
}

export function PreviewMode({ project, onClose }: PreviewModeProps) {
  const { t } = useI18n();
  const [currentPassageNumber, setCurrentPassageNumber] = useState<number>(() => {
    // Start from the first passage marked as start, or passage 1
    const startPassage = project.passages.find(p => p.isStart);
    return startPassage?.number || project.passages[0]?.number || 1;
  });

  const passages = [...project.passages].sort((a, b) => a.number - b.number);
  const currentPassage = passages.find(p => p.number === currentPassageNumber);

  if (!currentPassage) {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <p>{t("Preview.notFound")}</p>
          <Button onClick={onClose}>{t("Preview.close")}</Button>
        </div>
      </div>
    );
  }

  const handleNavigate = (targetNumber: number) => {
    setCurrentPassageNumber(targetNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("Preview.backToEditor")}
            </Button>
            <span className="text-muted-foreground">|</span>
            <span className="font-medium text-primary">{project.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("Preview.counter", { n: currentPassage.number, m: passages.length })}
            </span>
          </div>
        </div>
      </div>

      {/* Passage navigation */}
      <div className="sticky top-[61px] bg-muted/50 border-b border-border z-10">
        <div className="container mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-muted-foreground shrink-0">{t("Preview.goTo")}</span>
          {passages.map((p) => (
            <Button
              key={p.id}
              variant={p.number === currentPassageNumber ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 shrink-0"
              onClick={() => handleNavigate(p.number)}
            >
              {p.number}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Passage header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {currentPassage.isStart && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                <Flag className="w-3 h-3" />
                {t("Preview.start")}
              </span>
            )}
            {currentPassage.isEndpoint && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                <Target className="w-3 h-3" />
                {t("Preview.end")}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-primary">
            {t("Preview.heading", { n: currentPassage.number })}
            {currentPassage.title && (
              <span className="text-muted-foreground ml-3 text-2xl font-normal">
                — {currentPassage.title}
              </span>
            )}
          </h1>
        </div>

        {/* Passage content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="prose prose-lg max-w-none">
              {currentPassage.content.split("\n").map((paragraph, i) => (
                <p key={i} className="mb-4 text-foreground leading-relaxed">
                  {paragraph || "\u00A0"}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outgoing links */}
        {currentPassage.outgoingLinks.length > 0 && (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {t("Preview.options")}
              </h2>
              <div className="space-y-2">
                {currentPassage.outgoingLinks.map((link, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleNavigate(link.target.number)}
                  >
                    <ExternalLink className="w-4 h-4 mr-3 shrink-0 text-primary" />
                    <span>
                      {link.linkText || t("Preview.continueTo", { n: link.target.number })}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incoming links */}
        {currentPassage.incomingLinks.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                {t("Preview.referencedFrom")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentPassage.incomingLinks.map((link, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleNavigate(link.source.number)}
                  >
                    {t("Preview.passage", { n: link.source.number })}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick navigation */}
        <div className="flex justify-between items-center pt-8 border-t border-border">
          <Button
            variant="outline"
            disabled={currentPassage.number <= passages[0].number}
            onClick={() => {
              const prev = passages.find(p => p.number < currentPassage.number);
              if (prev) handleNavigate(prev.number);
            }}
          >
            {t("Preview.prev")}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("Preview.backToEditor")}
          </Button>
          <Button
            variant="outline"
            disabled={currentPassage.number >= passages[passages.length - 1].number}
            onClick={() => {
              const next = passages.find(p => p.number > currentPassage.number);
              if (next) handleNavigate(next.number);
            }}
          >
            {t("Preview.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
