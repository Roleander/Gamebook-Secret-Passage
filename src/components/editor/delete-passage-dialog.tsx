"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { Trash2 } from "lucide-react";

export type DeleteReferenceAction = "redirect" | "remove_sentences" | "leave";

interface DeletePassageDialogProps {
  passageNumber: number;
  affectedNumbers: number[];
  availableTargets: number[];
  onCancel: () => void;
  onConfirm: (
    action: DeleteReferenceAction,
    targetNumber?: number,
    closeGap?: boolean
  ) => void;
}

export function DeletePassageDialog({
  passageNumber,
  affectedNumbers,
  availableTargets,
  onCancel,
  onConfirm,
}: DeletePassageDialogProps) {
  const { t } = useI18n();
  const hasMentions = affectedNumbers.length > 0;
  const [action, setAction] = useState<DeleteReferenceAction>("leave");
  const [target, setTarget] = useState("");
  const [closeGap, setCloseGap] = useState(false);
  const [error, setError] = useState("");

  const parsedTarget = Number(target.trim());
  const targetValid =
    Number.isInteger(parsedTarget) &&
    parsedTarget >= 1 &&
    availableTargets.includes(parsedTarget);

  const handleConfirm = () => {
    if (hasMentions && action === "redirect") {
      if (!targetValid) {
        setError(t("DeleteDialog.invalidTarget"));
        return;
      }
      onConfirm("redirect", parsedTarget, closeGap);
      return;
    }
    onConfirm(action, undefined, closeGap && action !== "leave");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-md border border-border bg-card p-6 shadow-lg space-y-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Trash2 className="w-5 h-5 mr-2 text-destructive" />
          {t("DeleteDialog.title", { n: passageNumber })}
        </h3>

        {hasMentions ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t("DeleteDialog.mentions", {
                n: affectedNumbers.length,
                target: passageNumber,
              })}
            </p>
            <p>
              {affectedNumbers.map((n) => (
                <span
                  key={n}
                  className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-muted text-xs"
                >
                  {n}
                </span>
              ))}
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="delete-ref-action"
                  className="mt-1"
                  checked={action === "redirect"}
                  onChange={() => {
                    setAction("redirect");
                    setError("");
                  }}
                />
                <span>{t("DeleteDialog.optionRedirect")}</span>
              </label>
              {action === "redirect" && (
                <div className="ml-6">
                  <Input
                    inputMode="numeric"
                    placeholder={t("DeleteDialog.targetPlaceholder")}
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      setError("");
                    }}
                    className="w-32"
                  />
                  {error && (
                    <p className="text-xs text-destructive mt-1">{error}</p>
                  )}
                </div>
              )}

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="delete-ref-action"
                  className="mt-1"
                  checked={action === "remove_sentences"}
                  onChange={() => {
                    setAction("remove_sentences");
                    setError("");
                  }}
                />
                <span>{t("DeleteDialog.optionRemoveSentences")}</span>
              </label>

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="delete-ref-action"
                  className="mt-1"
                  checked={action === "leave"}
                  onChange={() => {
                    setAction("leave");
                    setError("");
                  }}
                />
                <span>{t("DeleteDialog.optionLeave")}</span>
              </label>
            </div>

            <label
              className="flex items-start gap-2 text-sm cursor-pointer"
              title={
                action === "leave" ? t("DeleteDialog.closeGapHintLeave") : undefined
              }
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={closeGap && action !== "leave"}
                disabled={action === "leave"}
                onChange={(e) => setCloseGap(e.target.checked)}
              />
              <span>{t("DeleteDialog.closeGap")}</span>
            </label>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("DeleteDialog.noMentions")}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            {t("DeleteDialog.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t("DeleteDialog.confirm", { n: passageNumber })}
          </Button>
        </div>
      </div>
    </div>
  );
}
