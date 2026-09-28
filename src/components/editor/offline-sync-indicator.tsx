"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { countMutations, subscribeQueue } from "@/lib/offline-queue";
import { CloudOff, RefreshCw } from "lucide-react";

export function OfflineSyncIndicator() {
  const { t } = useI18n();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      countMutations()
        .then((n) => setPending(n))
        .catch(() => {});
    };
    Promise.resolve().then(refresh);
    return subscribeQueue(refresh);
  }, []);

  if (online && pending === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        online
          ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
      title={t("Offline.syncHint")}
    >
      {online ? (
        <RefreshCw className="w-3 h-3" />
      ) : (
        <CloudOff className="w-3 h-3" />
      )}
      {!online && <span>{t("Offline.syncOffline")}</span>}
      {pending > 0 && (
        <span>
          {!online && " · "}
          {t("Offline.syncPending", { n: pending })}
        </span>
      )}
    </span>
  );
}
