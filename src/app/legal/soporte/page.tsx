import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Soporte y contacto",
};

export default function SoportePage() {
  return <LegalDoc kind="support" />;
}
