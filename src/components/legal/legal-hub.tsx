"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText, ShieldCheck, LifeBuoy, ArrowLeft } from "lucide-react";

export function LegalHub() {
  const { t } = useI18n();

  const cards = [
    { href: "/legal/terminos", icon: ScrollText, title: t("Legal.hub.termsCard"), desc: t("Legal.hub.termsCardDesc") },
    { href: "/legal/privacidad", icon: ShieldCheck, title: t("Legal.hub.privacyCard"), desc: t("Legal.hub.privacyCardDesc") },
    { href: "/legal/soporte", icon: LifeBuoy, title: t("Legal.hub.supportCard"), desc: t("Legal.hub.supportCardDesc") },
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("Legal.hub.backToHome")}
      </Link>

      <h1 className="text-3xl font-bold mb-3">{t("Legal.hub.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("Legal.hub.intro")}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-colors hover:border-primary/60">
              <CardContent className="p-5 space-y-2">
                <card.icon className="w-6 h-6 text-primary" />
                <p className="font-semibold text-sm">{card.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-8">{t("Legal.hub.notice")}</p>
    </main>
  );
}
