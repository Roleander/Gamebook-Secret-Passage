"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

export function HeroLogo() {
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    const loadLogo = () => {
      fetch("/api/admin/config")
        .then((res) => res.json())
        .then((data) => {
          setSiteLogo(data.siteLogo || null);
        })
        .catch(() => {});
    };
    loadLogo();
    window.addEventListener("site-config-updated", loadLogo);
    return () => window.removeEventListener("site-config-updated", loadLogo);
  }, []);

  if (siteLogo) {
    return (
      <div className="relative inline-flex items-center justify-center mb-8">
        <img
          src={siteLogo}
          alt="Logo de Secret Passage"
          className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain rounded-3xl border-2 border-primary/40 bg-card/40 p-4 glow-gold"
        />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/20 rounded-full mb-6 glow-gold">
      <BookOpen className="w-12 h-12 text-primary" />
    </div>
  );
}
