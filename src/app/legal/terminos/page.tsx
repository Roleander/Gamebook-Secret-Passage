import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Condiciones de uso",
};

export default function TerminosPage() {
  return <LegalDoc kind="terms" />;
}
