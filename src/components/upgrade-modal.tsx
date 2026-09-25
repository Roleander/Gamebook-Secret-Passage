"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface UpgradeModalProps {
  message?: string | null;
  onClose: () => void;
}

export function UpgradeModal({ message, onClose }: UpgradeModalProps) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded bg-primary/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-primary font-pixel">
            {t("Upgrade.title")}
          </h2>
        </div>
        <p className="text-muted-foreground mb-5">
          {message || t("Upgrade.text")}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("Common.close")}
          </Button>
          <Button
            onClick={() => {
              onClose();
              router.push("/pricing");
            }}
          >
            {t("Upgrade.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
