"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!title.trim()) {
      setError("El título es requerido");
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
        throw new Error(data.error || "Error al crear el proyecto");
      }

      router.push(`/editor/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el proyecto");
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
          Volver a Proyectos
        </Link>

        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-primary" />
              Nuevo Proyecto
            </CardTitle>
            <CardDescription>
              Crea un nuevo librojuego para empezar a trabajar en él
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
                  Título *
                </label>
                <Input
                  id="title"
                  placeholder="Mi Librojuego"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Descripción
                </label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Una breve descripción de tu librojuego..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Link href="/projects">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Proyecto"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
