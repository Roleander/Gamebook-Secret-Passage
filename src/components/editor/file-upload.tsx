"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    passagesCount?: number;
    linksCreated?: number;
    errors?: string[];
    warnings?: string[];
  } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await uploadFile(files[0]);
      }
    },
    [projectId]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file type
    const validTypes = [
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.oasis.opendocument.text",
      "text/html",
      "application/rtf",
    ];

    const validExtensions = [".txt", ".doc", ".docx", ".odt", ".html", ".htm", ".rtf"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setResult({
        success: false,
        message: "Tipo de archivo no soportado. Use .txt, .doc, .docx, .odt, .html o .rtf",
      });
      return;
    }

    // Client-side size check (max 4MB — Vercel Hobby plan limit)
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      setResult({
        success: false,
        message: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 4MB.`,
      });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response: Response;
      try {
        response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          throw new Error("La subida tardó demasiado (>60s). Intenta con un archivo más pequeño.");
        }
        throw new Error("Error de conexión con el servidor. Verifica tu conexión a internet.");
      }
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        let detail = "";
        try {
          const text = await response.text();
          detail = text.substring(0, 200);
        } catch {}
        throw new Error(
          `Error del servidor (${response.status}). ${detail || "Respuesta inesperada."} Intenta con otro archivo.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al subir el archivo");
      }

      setResult({
        success: true,
        message: data.message,
        passagesCount: data.passagesCount,
        linksCreated: data.linksCreated,
        errors: data.errors,
        warnings: data.warnings,
      });

      router.refresh();
      onUploadComplete?.();
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Error al subir el archivo",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          Arrastra un archivo aquí o haz clic para seleccionar
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Formatos soportados: .txt, .doc, .docx, .odt, .html, .rtf
        </p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".txt,.doc,.docx,.odt,.html,.htm,.rtf"
          onChange={handleFileSelect}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={isUploading}
        >
          <FileText className="w-4 h-4 mr-2" />
          Seleccionar Archivo
        </Button>
      </div>

      {isUploading && (
        <div className="flex items-center justify-center p-4 text-primary">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
          Procesando archivo...
        </div>
      )}

      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? "bg-green-500/10 border border-green-500/50"
              : "bg-destructive/10 border border-destructive/50"
          }`}
        >
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive mr-3 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${result.success ? "text-green-500" : "text-destructive"}`}>
                {result.message}
              </p>
              {result.passagesCount && (
                <p className="text-sm text-muted-foreground mt-1">
                  {result.passagesCount} pasajes importados
                </p>
              )}
              {result.linksCreated !== undefined && result.linksCreated > 0 && (
                <p className="text-sm text-green-500 mt-1">
                  {result.linksCreated} enlaces creados automáticamente
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                  {result.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <ul className="text-sm text-amber-500 mt-2 list-disc list-inside">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
