import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Soporte y contacto",
  description:
    "Soporte de Gamebook Secret Passage: dónde pedir ayuda, reportar errores y consultar preguntas frecuentes.",
  alternates: {
    canonical: "/legal/soporte",
  },
};

export default function SoportePage() {
  return <LegalDoc kind="support" />;
}
