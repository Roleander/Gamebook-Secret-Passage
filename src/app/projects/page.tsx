"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/header";
import { HeroLogo } from "@/components/hero-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Calendar, FileText, Trash2, Copy, Loader2 } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

interface Project {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  _count: {
    passages: number;
  };
}

export default function ProjectsPage() {
  const { t, locale } = useI18n();
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        window.location.replace("/auth/login?callbackUrl=/projects");
      }
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    let cancelled = false;
    fetch("/api/projects")
      .then((response) => {
        if (response.status === 401) {
          window.location.replace("/auth/login?callbackUrl=/projects");
          return null;
        }
        return response.ok ? response.json() : null;
      })
      .then((data) => {
        if (!cancelled && data) {
          setProjects(data);
        }
      })
      .catch((error) => {
        console.error("Error fetching projects:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t("Projects.confirmDelete"))) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleDuplicate = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (duplicatingId !== null) return;

    setDuplicatingId(projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}/duplicate`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);

      if (response.ok && data?.id) {
        router.push(`/editor/${data.id}`);
        return;
      }

      alert(
        data?.error ||
          (response.status === 402
            ? t("Projects.duplicateLimit")
            : t("Projects.duplicateError"))
      );
    } catch (error) {
      console.error("Error duplicating project:", error);
      alert(t("Projects.duplicateError"));
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <HeroLogo />
        </div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary font-pixel">
              {t("Projects.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("Projects.subtitle")}
            </p>
          </div>
          <Link href="/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("Projects.new")}
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">{t("Projects.empty")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("Projects.createFirst")}
              </p>
              <Link href="/projects/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("Projects.createFirstButton")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            {projects.map((project) => (
              <motion.div key={project.id} variants={fadeUp}>
              <Link href={`/editor/${project.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-primary" />
                        {project.title}
                      </span>
                      <span className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDuplicate(project.id, e)}
                          disabled={duplicatingId !== null}
                          title={t("Projects.duplicate")}
                          aria-label={t("Projects.duplicate")}
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                        >
                          {duplicatingId === project.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(project.id, e)}
                          title={t("Projects.delete")}
                          aria-label={t("Projects.delete")}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {project.description || t("Projects.noDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground space-x-4">
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {project._count.passages} {t("Projects.passages")}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(project.createdAt).toLocaleDateString(locale)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
