"use client";

import { Header } from "@/components/header";
import { HeroLogo } from "@/components/hero-logo";
import { BookOpen, Sparkles, FileText, ArrowRight, Upload, Link2, Download, ShieldCheck, Wand2, Crown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const steps = [
  {
    icon: Upload,
    title: "1. Importa",
    text: "Sube tu manuscrito en .doc, .odt o .txt y conviértelo en pasajes automáticamente.",
  },
  {
    icon: Link2,
    title: "2. Conecta",
    text: "Enlaza pasajes con un clic y detecta enlaces rotos o huérfanos antes de que los vea tu lector.",
  },
  {
    icon: Download,
    title: "3. Exporta",
    text: "Genera un PDF con estética de grimorio, un EPUB listo para librerías o un TXT limpio.",
  },
];

const features = [
  {
    icon: FileText,
    title: "De tu Word a la mazmorra en un clic",
    text: "Importa documentos y obtén pasajes numerados y estructurados sin reescribir nada.",
  },
  {
    icon: ShieldCheck,
    title: "Nunca envíes al lector a un callejón sin salida",
    text: "El detector de errores encuentra enlaces rotos, pasajes huérfanos y ramas sin final. El auto-fix los repara por ti.",
  },
  {
    icon: BookOpen,
    title: "Del grimorio a la librería",
    text: "Exporta PDF con diseño medieval, EPUB para e-readers y más formatos, con el estilo que defina tu obra.",
  },
];

const finalCta = [
  { icon: Sparkles, text: "12 idiomas de la interfaz" },
  { icon: Wand2, text: "Agentes de IA para tu guion" },
  { icon: Crown, text: "Plan gratis · Pro desde 9,99€" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-dungeon">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          className="text-center mb-20"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <HeroLogo />
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-bold mb-4 text-primary font-pixel"
          >
            Gamebook Secret Passage
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="text-2xl font-semibold text-foreground max-w-3xl mx-auto mb-3"
          >
            Forja librosjuegos que hipnotizan.
          </motion.p>
          <motion.p
            variants={fadeUp}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Importa tu manuscrito, conecta los pasajes sin enlaces rotos y
            exporta a PDF, EPUB o TXT con estética de grimorio medieval.
          </motion.p>
          <motion.p variants={fadeUp} className="text-sm text-muted-foreground mt-4">
            Sin instalación · Tu primer pasaje en 2 minutos · 3 proyectos gratis
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-4 mt-8"
          >
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-4">
                Empezar gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                Ver planes
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Cómo funciona */}
        <motion.section
          className="mb-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold text-center text-primary mb-10 font-pixel"
          >
            Cómo funciona
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="border-medieval rounded-lg p-6 bg-card/50 text-center"
              >
                <step.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          className="mb-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-bold text-center text-primary mb-10 font-pixel"
          >
            Hecho para autores
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="border-medieval rounded-lg p-6 bg-card/50"
              >
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Prueba social / franja */}
        <motion.div
          className="mb-16 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          {finalCta.map((item) => (
            <motion.span
              key={item.text}
              variants={fadeUp}
              className="flex items-center gap-2 border border-medieval rounded-full px-4 py-2 bg-card/40"
            >
              <item.icon className="w-4 h-4 text-primary" />
              {item.text}
            </motion.span>
          ))}
        </motion.div>

        {/* CTA final */}
        <motion.div
          className="text-center border-medieval rounded-lg p-10 bg-card/50"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl font-bold mb-3 text-primary font-pixel"
          >
            ¿Listo para abrir la puerta secreta?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Crea tu cuenta gratis y convierte tu idea en un librojuego jugable.
            Sin tarjeta, sin instalación.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/projects/new">
              <Button size="lg" className="text-lg px-8 py-4">
                Crear mi primer proyecto
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
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
