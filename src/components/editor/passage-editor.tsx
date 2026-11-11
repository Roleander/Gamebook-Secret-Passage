"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Link2, Unlink, ArrowDown, ArrowUp, ImagePlus, Loader2 } from "lucide-react";
import { forceReplaceNumber } from "@/lib/number-references";
import { useI18n } from "@/lib/i18n";


interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  illustration?: string | null;
  illustrationAlt?: string | null;
  outgoingLinks: { targetId: string; target: { number: number } }[];
  incomingLinks: { sourceId: string; source: { number: number } }[];
}

interface PassageEditorProps {
  passage: Passage;
  allPassages: Passage[];
  onUpdate: (updates: Partial<Passage>) => Promise<boolean>;
  onDelete: () => void;
  onLinkAction: (
    action:
      | { type: "create"; sourceId: string; targetId: string; linkText: string }
      | { type: "delete"; sourceId: string; targetId: string }
  ) => Promise<boolean>;
}

export function PassageEditor({
  passage,
  allPassages,
  onUpdate,
  onDelete,
  onLinkAction,
}: PassageEditorProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(passage.title || "");
  const [number, setNumber] = useState(passage.number);
  const [content, setContent] = useState(passage.content);
  const [isStart, setIsStart] = useState(passage.isStart);
  const [isEndpoint, setIsEndpoint] = useState(passage.isEndpoint);
  const [illustration, setIllustration] = useState(passage.illustration || "");
  const [illustrationAlt, setIllustrationAlt] = useState(passage.illustrationAlt || "");
  const [uploadingIllustration, setUploadingIllustration] = useState(false);
  const [illustrationError, setIllustrationError] = useState<string | null>(null);
  const [showOutgoingDialog, setShowOutgoingDialog] = useState(false);
  const [showIncomingDialog, setShowIncomingDialog] = useState(false);
  const [linkTarget, setLinkTarget] = useState<number | "">("");
  const [forceFrom, setForceFrom] = useState<number | "">("");
  const [forceTo, setForceTo] = useState<number | "">("");
  const [forcePreview, setForcePreview] = useState<string | null>(null);

  const handleSave = async () => {
    const ok = await onUpdate({
      number,
      title: title || null,
      content,
      isStart,
      isEndpoint,
      illustration: illustration.trim() || null,
      illustrationAlt: illustrationAlt.trim() || null,
    });
    if (!ok) {
      setNumber(passage.number);
    }
  };

  const handleIllustrationUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setIllustrationError(null);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setIllustrationError(t("Passage.illustrationTypeError"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setIllustrationError(t("Passage.illustrationSizeError"));
      return;
    }

    setUploadingIllustration(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "illustration");
      formData.append("passageId", passage.id);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) {
        setIllustrationError(data?.error || t("Passage.illustrationUploadError"));
        return;
      }
      setIllustration(data.url);
    } catch {
      setIllustrationError(t("Passage.illustrationUploadError"));
    } finally {
      setUploadingIllustration(false);
    }
  };

  const handleCreateOutgoingLink = async () => {
    if (linkTarget === "") return;

    const targetPassage = allPassages.find(p => p.number === linkTarget);
    if (!targetPassage) {
      alert(t("Passage.targetNotFound"));
      return;
    }

    const ok = await onLinkAction({
      type: "create",
      sourceId: passage.id,
      targetId: targetPassage.id,
      linkText: t("Passage.goToLink", { n: linkTarget }),
    });
    if (ok) {
      setShowOutgoingDialog(false);
      setLinkTarget("");
    }
  };

  const handleCreateIncomingLink = async () => {
    if (linkTarget === "") return;

    const sourcePassage = allPassages.find(p => p.number === linkTarget);
    if (!sourcePassage) {
      alert(t("Passage.sourceNotFound"));
      return;
    }

    const ok = await onLinkAction({
      type: "create",
      sourceId: sourcePassage.id,
      targetId: passage.id,
      linkText: t("Passage.goToLink", { n: passage.number }),
    });
    if (ok) {
      setShowIncomingDialog(false);
      setLinkTarget("");
    }
  };

  const handleDeleteLink = async (targetId: string) => {
    await onLinkAction({ type: "delete", sourceId: passage.id, targetId });
  };

  // Available passages for linking (excluding current)
  const availableForOutgoing = allPassages.filter(p => p.number !== passage.number);
  const availableForIncoming = allPassages.filter(
    p => p.number !== passage.number && !passage.incomingLinks.some(l => l.sourceId === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">
          {t("Passage.heading", { n: passage.number })}
          {passage.title && (
            <span className="text-muted-foreground ml-2">- {passage.title}</span>
          )}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            {t("Passage.save")}
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t("Passage.delete")}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="passage-title" className="text-sm font-medium">
            {t("Passage.title")}
          </label>
          <Input
            id="passage-title"
            placeholder={t("Passage.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="passage-number" className="text-sm font-medium">
            {t("Passage.targetNumber")}
          </label>
          <Input
            id="passage-number"
            type="number"
            min={1}
            value={number}
            onChange={(e) => setNumber(parseInt(e.target.value) || passage.number)}
          />
            
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isStart}
              onChange={(e) => setIsStart(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">{t("Passage.isStart")}</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isEndpoint}
              onChange={(e) => setIsEndpoint(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">{t("Passage.isEnd")}</span>
          </label>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-medium">Forzar reescritura de un número</h3>
        <p className="text-xs text-muted-foreground">
          Sustituye todas las ocurrencias enteras de un número en el texto de este pasaje.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs">{t("Passage.sourceNumber")}</label>
            <Input
              type="number"
              min={1}
              value={forceFrom}
              onChange={(e) => setForceFrom(parseInt(e.target.value) || "")}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs">{t("Passage.targetNumber")}</label>
            <Input
              type="number"
              min={1}
              value={forceTo}
              onChange={(e) => setForceTo(parseInt(e.target.value) || "")}
              className="w-24"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof forceFrom !== "number" || typeof forceTo !== "number") return;
              setForcePreview(forceReplaceNumber(content, forceFrom, forceTo));
            }}
            disabled={typeof forceFrom !== "number" || typeof forceTo !== "number"}
          >
            {t("Editor.preview")}
          </Button>
        </div>
        {forcePreview !== null && (
          <div className="space-y-2">
            <textarea
              readOnly
              className="flex min-h-[160px] w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono"
              value={forcePreview}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setContent(forcePreview); setForcePreview(null); setForceFrom(""); setForceTo(""); }}>
                {t("Passage.save")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setForcePreview(null); }}>
                {t("Passage.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="passage-content" className="text-sm font-medium">
          {t("Passage.content")}
        </label>
        <textarea
          id="passage-content"
          className="flex min-h-[300px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
          placeholder={t("Passage.contentPlaceholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium flex items-center">
          <ImagePlus className="w-4 h-4 mr-2 text-primary" />
          {t("Passage.illustration")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("Passage.illustrationHint")}
        </p>

        {illustration && (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <img
              src={illustration}
              alt={illustrationAlt || ""}
              className="mx-auto max-h-64 w-auto max-w-full rounded border border-border bg-background p-1"
            />
            <Input
              value={illustrationAlt}
              onChange={(e) => setIllustrationAlt(e.target.value)}
              placeholder={t("Passage.illustrationAltPlaceholder")}
              maxLength={300}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIllustration("");
                setIllustrationAlt("");
                setIllustrationError(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("Passage.removeIllustration")}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleIllustrationUpload}
            disabled={uploadingIllustration}
            className="max-w-sm cursor-pointer text-sm file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-sm file:text-primary"
          />
          {uploadingIllustration && (
            <span className="flex items-center text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              {t("Passage.illustrationUploading")}
            </span>
          )}
        </div>
        {illustrationError && (
          <p className="text-xs text-destructive">{illustrationError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {t("Passage.illustrationSaveHint")}
        </p>
      </div>

      {/* Links Section */}
      <div className="grid md:grid-cols-2 gap-6 border-t border-border pt-6">
        {/* Outgoing Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowUp className="w-4 h-4 mr-2 text-green-500" />
              {t("Passage.outgoingLinks", { n: passage.outgoingLinks.length })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowOutgoingDialog(true);
                setLinkTarget("");
              }}
            >
              <Link2 className="w-4 h-4 mr-1" />
              {t("Passage.add")}
            </Button>
          </div>

          {passage.outgoingLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Passage.noOutgoing")}
            </p>
          ) : (
            <div className="space-y-2">
              {passage.outgoingLinks.map((link) => (
                <div
                  key={link.targetId}
                  className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                >
                  <span className="flex items-center">
                    <Link2 className="w-4 h-4 mr-2 text-green-500" />
                    {t("Passage.outLink", { n: link.target.number })}
                  </span>
                  <button
                    onClick={() => handleDeleteLink(link.targetId)}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Links */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowDown className="w-4 h-4 mr-2 text-blue-500" />
              {t("Passage.incomingLinks", { n: passage.incomingLinks.length })}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowIncomingDialog(true);
                setLinkTarget("");
              }}
            >
              <Link2 className="w-4 h-4 mr-1" />
              {t("Passage.add")}
            </Button>
          </div>

          {passage.incomingLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Passage.noIncoming")}
            </p>
          ) : (
            <div className="space-y-2">
              {passage.incomingLinks.map((link) => (
                <div
                  key={link.sourceId}
                  className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md"
                >
                  <span className="flex items-center">
                    <Link2 className="w-4 h-4 mr-2 text-blue-500" />
                    {t("Passage.inLink", { n: link.source.number })}
                  </span>
                  <button
                    onClick={async () => {
                      await onLinkAction({
                        type: "delete",
                        sourceId: link.sourceId,
                        targetId: passage.id,
                      });
                    }}
                    className="text-destructive hover:text-destructive/80 p-1"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outgoing Link Dialog */}
      {showOutgoingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border-medieval">
            <h3 className="text-lg font-medium mb-4">{t("Passage.addOutgoing")}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Passage.addTarget")}</label>
                <Input
                  type="number"
                  placeholder={t("Passage.targetNumber")}
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(parseInt(e.target.value) || "")}
                />
                <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
                  {availableForOutgoing.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setLinkTarget(p.number)}
                      className="text-xs px-2 py-1 bg-muted rounded hover:bg-primary hover:text-primary-foreground"
                    >
                      {p.number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowOutgoingDialog(false)}>
                  {t("Passage.cancel")}
                </Button>
                <Button onClick={handleCreateOutgoingLink} disabled={linkTarget === ""}>
                  {t("Passage.createLink")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Link Dialog */}
      {showIncomingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border-medieval">
            <h3 className="text-lg font-medium mb-4">{t("Passage.addIncoming")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("Passage.incomingHint", { n: passage.number })}
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("Passage.source")}</label>
                <Input
                  type="number"
                  placeholder={t("Passage.sourceNumber")}
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(parseInt(e.target.value) || "")}
                />
                <div className="flex flex-wrap gap-1 mt-2 max-h-32 overflow-y-auto">
                  {availableForIncoming.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setLinkTarget(p.number)}
                      className="text-xs px-2 py-1 bg-muted rounded hover:bg-primary hover:text-primary-foreground"
                    >
                      {p.number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowIncomingDialog(false)}>
                  {t("Passage.cancel")}
                </Button>
                <Button onClick={handleCreateIncomingLink} disabled={linkTarget === ""}>
                  {t("Passage.createLink")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
