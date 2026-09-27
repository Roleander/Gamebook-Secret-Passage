import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Política de privacidad",
};

export default function PrivacidadPage() {
  return <LegalDoc kind="privacy" />;
}
