"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface AvatarUploadProps {
  currentAvatar: string | null;
  onAvatarUpdate: (url: string) => void;
}

export function AvatarUpload({ currentAvatar, onAvatarUpdate }: AvatarUploadProps) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t("Profile.fileTooLarge"));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.url);
        onAvatarUpdate(data.url);
      } else {
        const error = await response.json();
        alert(error.error || t("Profile.uploadError"));
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? t("Profile.uploading") : t("Profile.changeAvatar")}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">{t("Profile.avatarHint")}</p>
      </div>
    </div>
  );
}
