"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";

interface LogoUploadProps {
  currentLogo: string | null;
  onLogoUpdate: (url: string) => void;
}

export function LogoUpload({ currentLogo, onLogoUpdate }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Archivo demasiado grande. Máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.url);
        onLogoUpdate(data.url);
      } else {
        const error = await response.json();
        alert(error.error || "Error al subir logo");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border">
        {preview ? (
          <img src={preview} alt="Logo del sitio" className="w-full h-full object-contain" />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
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
          {uploading ? "Subiendo..." : currentLogo ? "Cambiar logo" : "Subir logo"}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG o SVG. Máx. 2MB. Recuerda pulsar «Guardar logo» tras subirlo.
        </p>
      </div>
    </div>
  );
}
