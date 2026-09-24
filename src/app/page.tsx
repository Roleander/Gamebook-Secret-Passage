import { Header } from "@/components/header";
import { HeroLogo } from "@/components/hero-logo";
import { BookOpen, Sparkles, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-dungeon">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <HeroLogo />
          <h1 className="text-5xl font-bold mb-4 text-primary font-pixel">
            Gamebook Secret Passage
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crea, edita y exporta librosjuegos interactivos. 
            Conecta pasajes, detecta errores y genera PDFs/EPUBs con estilo medieval.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="border-medieval rounded-lg p-6 bg-card/50">
            <FileText className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Importa Documentos</h3>
            <p className="text-muted-foreground">
              Sube archivos .doc, .odt, .txt y conviértelos en pasajes de librojuego automáticamente.
            </p>
          </div>

          <div className="border-medieval rounded-lg p-6 bg-card/50">
            <Sparkles className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Conecta Pasajes</h3>
            <p className="text-muted-foreground">
              Crea hipervínculos entre pasajes y detecta errores de conexión automáticamente.
            </p>
          </div>

          <div className="border-medieval rounded-lg p-6 bg-card/50">
            <BookOpen className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Exporta tu Obra</h3>
            <p className="text-muted-foreground">
              Genera PDFs con diseño medieval y archivos EPUB para lectores de ebooks.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link href="/projects/new">
            <Button size="lg" className="text-lg px-8 py-4">
              Crear Nuevo Proyecto
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Gamebook Secret Passage &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
