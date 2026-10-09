"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, FileText, BarChart3, CreditCard, LayoutDashboard } from "lucide-react";
import { UsersPanel } from "@/components/admin/users-panel";
import { PaymentsPanel } from "@/components/admin/payments-panel";

type Tab = "resumen" | "usuarios" | "pagos";

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalPassages: number;
  pdfExports30d?: number;
  pdfExportLimit?: number;
  recentProjects: {
    id: string;
    title: string;
    createdAt: string;
    user: { name: string | null; email: string };
    _count: { passages: number };
  }[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, router, session]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-dungeon">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary font-pixel mb-4">
          Panel de Administración
        </h1>

        <div className="flex gap-2 mb-8">
          <Button
            variant={tab === "resumen" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("resumen")}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Resumen
          </Button>
          <Button
            variant={tab === "usuarios" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("usuarios")}
          >
            <Users className="w-4 h-4 mr-2" />
            Usuarios
          </Button>
          <Button
            variant={tab === "pagos" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("pagos")}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pagos
          </Button>
        </div>

        {tab === "usuarios" && <UsersPanel />}
        {tab === "pagos" && <PaymentsPanel />}

        {tab === "resumen" && (
          <>
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-10 h-10 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="w-10 h-10 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Proyectos</p>
                  <p className="text-2xl font-bold">{stats?.totalProjects || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="w-10 h-10 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Pasajes</p>
                  <p className="text-2xl font-bold">{stats?.totalPassages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="w-10 h-10 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Promedio</p>
                  <p className="text-2xl font-bold">
                    {stats?.totalProjects
                      ? Math.round(stats.totalPassages / stats.totalProjects)
                      : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Exports PDF (30 días):{" "}
          <span className="font-bold text-foreground">{stats?.pdfExports30d ?? 0}</span>
          {" / "}
          {stats?.pdfExportLimit ?? "—"}
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Proyectos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentProjects && stats.recentProjects.length > 0 ? (
              <div className="space-y-4">
                {stats.recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.user.name || project.user.email} •{" "}
                        {project._count.passages} pasajes
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/editor/${project.id}`)}
                    >
                      Abrir
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay proyectos aún
              </p>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </main>
    </div>
  );
}
