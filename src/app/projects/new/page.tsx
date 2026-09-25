"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useI18n } from "@/lib/i18n";

export default function NewProjectPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!title.trim()) {
      setError(t("NewProject.titleRequired"));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setUpgradeMsg(data.error || "");
          setLoading(false);
          return;
        }
        throw new Error(data.error || t("NewProject.createError"));
      }

      router.push(`/editor/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("NewProject.createError"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("NewProject.backToProjects")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-lg mx-auto"
        >
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-primary" />
              {t("NewProject.title")}
            </CardTitle>
            <CardDescription>
              {t("NewProject.subtitle")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  {t("NewProject.titleLabel")}
                </label>
                <Input
                  id="title"
                  placeholder={t("NewProject.namePlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  {t("NewProject.description")}
                </label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t("NewProject.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Link href="/projects">
                <Button variant="outline" type="button">
                  {t("NewProject.cancel")}
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? t("NewProject.creating") : t("NewProject.create")}
              </Button>
            </CardFooter>
          </form>
        </Card>
        </motion.div>
      </main>

      {upgradeMsg !== null && (
        <UpgradeModal
          message={upgradeMsg}
          onClose={() => setUpgradeMsg(null)}
        />
      )}
    </div>
  );
}
