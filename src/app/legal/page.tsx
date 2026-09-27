import type { Metadata } from "next";
import { LegalHub } from "@/components/legal/legal-hub";

export const metadata: Metadata = {
  title: "Legal",
};

export default function LegalPage() {
  return <LegalHub />;
}
