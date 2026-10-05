import type { Metadata } from "next";
import { LegalHub } from "@/components/legal/legal-hub";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Condiciones de uso, política de privacidad y soporte de Gamebook Secret Passage.",
  alternates: {
    canonical: "/legal",
  },
};

export default function LegalPage() {
  return <LegalHub />;
}
