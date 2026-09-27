"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { History, Save, RotateCcw, Lock, Loader2 } from "lucide-react";

interface SnapshotItem {
  id: string;
  label: string;
  createdAt: string;
}

interface HistoryPanelProps {
  projectId: string;
  isPro: boolean;
  onRequireUpgrade: (message: string) => void;
  onChanged: () => void;
}

export function HistoryPanel({ projectId, isPro, onRequireUpgrade, onChanged }: HistoryPanelProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.snapshots || []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setOpen((o) => !o);
    if (open) void load();
  };

  const handleUpgrade = async (response: Response) => {
    if (response.status === 402) {
      try {
        const data = await response.json();
        onRequireUpgrade(data.error || "");
      } catch {
        onRequireUpgrade("");
      }
      return true;
    }
    return false;
  };

  const handleSave = async () => {
    if (!isPro) { onRequireUpgrade(""); return; }
    if (!confirm(t("History.confirmSave"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: t("History.manualLabel") }),
      });
      if (await handleUpgrade(res)) return;
      if (res.ok) {
        alert(t("History.saved"));
        await load();
        onChanged();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || t("History.error"));
      }
    } catch {
      alert(t("History.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!isPro) { onRequireUpgrade(""); return; }
    if (!confirm(t("History.confirmRestore"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots/${id}`, { method: "POST" });
      if (await handleUpgrade(res)) return;
      if (res.ok) {
        alert(t("History.restored"));
        await load();
        onChanged();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || t("History.error"));
      }
    } catch {
      alert(t("History.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={toggle} title={t("History.title")}>
        <History className="w-4 h-4 mr-2" />
        {t("History.title")}
        {!isPro && <Lock className="w-3 h-3 ml-2 text-primary/70" />}
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 max-h-[80vh] overflow-y-auto">
          <div className="bg-card border border-border rounded-md shadow-lg py-2 min-w-[260px] max-h-[80vh]">
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("History.title")}</p>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={busy}>
                <Save className="w-3.5 h-3.5 mr-1" />
                {t("History.save")}
              </Button>
            </div>
            {loading ? (
              <p className="px-4 py-2 text-sm text-muted-foreground">{t("History.restoring")}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-2 text-sm text-muted-foreground">{t("History.empty")}</p>
            ) : (
              <div className="px-4 pb-2 border-t border-border space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border last:border-b-0 py-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => handleRestore(s.id)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      {t("History.restore")}
                      {!isPro && <Lock className="w-3 h-3 ml-1 text-primary/70" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}