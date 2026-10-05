import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Condiciones de uso",
  description:
    "Condiciones de uso de Gamebook Secret Passage: cuentas, contenido, pagos y responsabilidades.",
  alternates: {
    canonical: "/legal/terminos",
  },
};

export default function TerminosPage() {
  return <LegalDoc kind="terms" />;
}
