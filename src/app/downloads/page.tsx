"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, Apple, Terminal, Download, ExternalLink, Check } from "lucide-react";

type Platform = "windows" | "mac" | "linux";

interface DownloadInfo {
  id: Platform;
  name: string;
  icon: React.ReactNode;
  description: string;
  formats: {
    name: string;
    extension: string;
    size: string;
    url: string;
  }[];
}

const downloads: DownloadInfo[] = [
  {
    id: "windows",
    name: "Windows",
    icon: <Monitor className="w-12 h-12" />,
    description: "Para Windows 10/11 (64 bits)",
    formats: [
      {
        name: "Instalador",
        extension: ".exe",
        size: "~85 MB",
        url: "#", // Replace with actual download URL
      },
      {
        name: "Portable",
        extension: ".exe",
        size: "~80 MB",
        url: "#",
      },
    ],
  },
  {
    id: "mac",
    name: "macOS",
    icon: <Apple className="w-12 h-12" />,
    description: "Para macOS 12+ (Intel & Apple Silicon)",
    formats: [
      {
        name: "Disk Image",
        extension: ".dmg",
        size: "~90 MB",
        url: "#",
      },
    ],
  },
  {
    id: "linux",
    name: "Linux",
    icon: <Terminal className="w-12 h-12" />,
    description: "Para Ubuntu, Debian, Fedora y más",
    formats: [
      {
        name: "AppImage",
        extension: ".AppImage",
        size: "~85 MB",
        url: "#",
      },
      {
        name: "Debian/Ubuntu",
        extension: ".deb",
        size: "~80 MB",
        url: "#",
      },
    ],
  },
];

export default function DownloadsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("windows");
  const [downloadStarted, setDownloadStarted] = useState<Platform | null>(null);

  const handleDownload = (platform: DownloadInfo, format: typeof platform.formats[0]) => {
    setDownloadStarted(platform.id);
    
    // Track download (optional)
    fetch("/api/downloads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: platform.id,
        format: format.extension,
      }),
    }).catch(() => {});

    // For now, show alert. Replace with actual download URL
    alert(`Descarga iniciada: ${platform.name} ${format.name}${format.extension}\n\nNota: Reemplaza las URLs de descarga en downloads/page.tsx con tus archivos reales.`);
    
    setTimeout(() => setDownloadStarted(null), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Descargar Secret Passage
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Descarga la versión de escritorio para tu sistema operativo.
            Misma aplicación, mejor rendimiento.
          </p>
        </div>

        {/* Features banner */}
        <Card className="mb-12 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="font-bold text-primary">Funciona sin internet</h3>
                <p className="text-sm text-muted-foreground">Crea y edita tus librojuegos sin conexión</p>
              </div>
              <div>
                <h3 className="font-bold text-primary">Rendimiento nativo</h3>
                <p className="text-sm text-muted-foreground">Más rápido que la versión web</p>
              </div>
              <div>
                <h3 className="font-bold text-primary">Actualizaciones automáticas</h3>
                <p className="text-sm text-muted-foreground">Siempre con la última versión</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform selector */}
        <div className="flex justify-center gap-4 mb-8">
          {downloads.map((platform) => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedPlatform(platform.id)}
              className="gap-2"
            >
              {platform.icon}
              <span className="hidden sm:inline">{platform.name}</span>
            </Button>
          ))}
        </div>

        {/* Download cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {downloads.map((platform) => (
            <Card
              key={platform.id}
              className={`relative transition-all ${
                selectedPlatform === platform.id
                  ? "border-primary shadow-lg scale-105"
                  : "opacity-75"
              }`}
            >
              {selectedPlatform === platform.id && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                    SELECCIONADO
                  </span>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="mx-auto mb-4 text-primary">
                  {platform.icon}
                </div>
                <CardTitle className="text-2xl">{platform.name}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {platform.formats.map((format) => (
                    <Button
                      key={format.extension}
                      variant={selectedPlatform === platform.id ? "default" : "outline"}
                      className="w-full justify-between"
                      onClick={() => handleDownload(platform, format)}
                      disabled={downloadStarted === platform.id}
                    >
                      <span className="flex items-center gap-2">
                        {downloadStarted === platform.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {format.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format.extension} • {format.size}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requirements */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Requisitos del sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-bold mb-2">Windows</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Windows 10 o posterior</li>
                    <li>• 4 GB de RAM</li>
                    <li>• 200 MB de espacio</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">macOS</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• macOS 12 Monterey+</li>
                    <li>• 4 GB de RAM</li>
                    <li>• 200 MB de espacio</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Linux</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Ubuntu 20.04+</li>
                    <li>• 4 GB de RAM</li>
                    <li>• 200 MB de espacio</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Source code */}
        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>
            ¿Prefieres compilar desde el código fuente?{" "}
            <a
              href="https://github.com/Roleander/Gamebook-Secret-Passage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Ver en GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
