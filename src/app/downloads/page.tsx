"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, Apple, Terminal, Download, ExternalLink, Check, ArrowLeft } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

type Platform = "windows" | "mac" | "linux";

const GITHUB_REPO = "https://github.com/Roleander/Gamebook-Secret-Passage";

const platforms: { id: Platform; name: string; icon: React.ReactNode; descKey: string; formats: { nameKey: string; extension: string; size: string; url: string }[] }[] = [
  {
    id: "windows",
    name: "Windows",
    icon: <Monitor className="w-12 h-12" />,
    descKey: "Downloads.windowsDesc",
    formats: [
      {
        nameKey: "Downloads.installer",
        extension: ".exe",
        size: "~85 MB",
        url: `${GITHUB_REPO}/releases/latest/download/Secret-Passage-Setup.exe`,
      },
      {
        nameKey: "Downloads.portable",
        extension: ".exe",
        size: "~80 MB",
        url: `${GITHUB_REPO}/releases/latest/download/Secret-Passage-Portable.exe`,
      },
    ],
  },
  {
    id: "mac",
    name: "macOS",
    icon: <Apple className="w-12 h-12" />,
    descKey: "Downloads.macDesc",
    formats: [
      {
        nameKey: "Downloads.macAppleSilicon",
        extension: ".dmg",
        size: "~85 MB",
        url: `${GITHUB_REPO}/releases/latest/download/Secret-Passage-arm64.dmg`,
      },
      {
        nameKey: "Downloads.macIntel",
        extension: ".dmg",
        size: "~90 MB",
        url: `${GITHUB_REPO}/releases/latest/download/Secret-Passage-x64.dmg`,
      },
    ],
  },
  {
    id: "linux",
    name: "Linux",
    icon: <Terminal className="w-12 h-12" />,
    descKey: "Downloads.linuxDesc",
    formats: [
      {
        nameKey: "Downloads.appImage",
        extension: ".AppImage",
        size: "~85 MB",
        url: `${GITHUB_REPO}/releases/latest/download/Secret-Passage.AppImage`,
      },
      {
        nameKey: "Downloads.debian",
        extension: ".deb",
        size: "~80 MB",
        url: `${GITHUB_REPO}/releases/latest/download/Secret-Passage.deb`,
      },
    ],
  },
];

export default function DownloadsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("windows");
  const [downloadStarted, setDownloadStarted] = useState<Platform | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const downloads = platforms.map((p) => ({
    ...p,
    description: t(p.descKey),
    formats: p.formats.map((f) => ({ ...f, name: t(f.nameKey) })),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Back (needed in desktop app, which has no browser nav) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("Common.back")}
        </Button>

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-bold text-primary mb-4"
          >
            {t("Downloads.title")}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            {t("Downloads.subtitle")}
          </motion.p>
        </motion.div>

        {/* Features banner */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
        <Card className="mb-12 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="font-bold text-primary">{t("Downloads.noInternet")}</h3>
                <p className="text-sm text-muted-foreground">{t("Downloads.noInternetDesc")}</p>
              </div>
              <div>
                <h3 className="font-bold text-primary">{t("Downloads.performance")}</h3>
                <p className="text-sm text-muted-foreground">{t("Downloads.performanceDesc")}</p>
              </div>
              <div>
                <h3 className="font-bold text-primary">{t("Downloads.updates")}</h3>
                <p className="text-sm text-muted-foreground">{t("Downloads.updatesDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

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
        <motion.div
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
        >
          {downloads.map((platform) => (
            <motion.div
              key={platform.id}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
            <Card
              className={`relative h-full transition-all ${
                selectedPlatform === platform.id
                  ? "border-primary shadow-lg scale-105"
                  : "opacity-75"
              }`}
            >
              {selectedPlatform === platform.id && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                    {t("Downloads.selected")}
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
                  {platform.formats.map((format, index) => (
                    <a
                      key={`${platform.id}-${index}`}
                      href={format.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full text-center p-3 rounded-md border transition-colors ${
                        selectedPlatform === platform.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:bg-muted"
                      }`}
                      onClick={(e) => {
                        if (format.url === "#") {
                          e.preventDefault();
                          return;
                        }
                        setDownloadStarted(platform.id);
                        setTimeout(() => setDownloadStarted(null), 3000);
                      }}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {downloadStarted === platform.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {format.name}
                        {format.url === "#" && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{t("Downloads.soon")}</span>
                        )}
                      </span>
                      <span className="text-xs opacity-70">
                        {format.extension} • {format.size}
                      </span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Requirements */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t("Downloads.requirements")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-bold mb-2">Windows</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {t("Downloads.reqWin10")}</li>
                    <li>• {t("Downloads.reqRam")}</li>
                    <li>• {t("Downloads.reqDisk")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">macOS</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {t("Downloads.reqMac12")}</li>
                    <li>• {t("Downloads.reqRam")}</li>
                    <li>• {t("Downloads.reqDisk")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Linux</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {t("Downloads.reqUbuntu")}</li>
                    <li>• {t("Downloads.reqRam")}</li>
                    <li>• {t("Downloads.reqDisk")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Source code */}
        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>
            {t("Downloads.sourceCode")}{" "}
            <a
              href="https://github.com/Roleander/Gamebook-Secret-Passage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {t("Downloads.viewOnGitHub")}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
