import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Política de privacidad de Gamebook Secret Passage: qué datos recogemos, cómo los usamos y cómo ejercer tus derechos.",
  alternates: {
    canonical: "/legal/privacidad",
  },
};

export default function PrivacidadPage() {
  return <LegalDoc kind="privacy" />;
}
