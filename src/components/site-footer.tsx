"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {t("Footer.copyright")}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/legal/terminos" className="hover:text-foreground transition-colors">
            {t("Legal.hub.termsCard")}
          </Link>
          <Link href="/legal/privacidad" className="hover:text-foreground transition-colors">
            {t("Legal.hub.privacyCard")}
          </Link>
          <Link href="/legal/soporte" className="hover:text-foreground transition-colors">
            {t("Legal.hub.supportCard")}
          </Link>
          <Link href="/legal" className="hover:text-foreground transition-colors">
            {t("Legal.hub.title")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
