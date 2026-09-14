"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Calendar, FileText } from "lucide-react";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary font-pixel">
              Mis Proyectos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tus librosjuegos
            </p>
          </div>
          <Link href="/projects/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Proyecto
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
              <h3 className="text-lg font-medium mb-2">No hay proyectos aún</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer proyecto para empezar a trabajar en tu librojuego
              </p>
              <Link href="/projects/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Proyecto
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/editor/${project.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-5 h-5 mr-2 text-primary" />
                      {project.title}
                    </CardTitle>
                    <CardDescription>
                      {project.description || "Sin descripción"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground space-x-4">
                      <span className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {project._count.passages} pasajes
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(project.createdAt).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
