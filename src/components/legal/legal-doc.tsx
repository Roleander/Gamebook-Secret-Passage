"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, ExternalLink } from "lucide-react";

type DocKind = "terms" | "privacy" | "support";

interface DocSection {
  h: string;
  p: string;
}

export function LegalDoc({ kind }: { kind: DocKind }) {
  const { t } = useI18n();

  const title = t(`Legal.${kind}.title`);
  const updated = t(`Legal.${kind}.updated`);
  const intro = t(`Legal.${kind}.intro`);
  const sections = t(`Legal.${kind}.sections`) as unknown as DocSection[];

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/legal"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("Legal.hub.title")}
      </Link>

      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-xs text-muted-foreground mb-6">{updated}</p>
      <p className="text-muted-foreground leading-relaxed mb-8">{intro}</p>

      <div className="space-y-7">
        {Array.isArray(sections) &&
          sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold mb-2">{section.h}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.p}
              </p>
            </section>
          ))}
      </div>

      {kind === "support" && (
        <div className="mt-8">
          <a
            href="https://github.com/Roleander/Gamebook-Secret-Passage/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {t("Legal.support.githubCta")}
          </a>
          <p className="text-xs text-muted-foreground mt-3">{t("Legal.support.githubHint")}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-10">{t("Legal.hub.notice")}</p>
    </main>
  );
}
