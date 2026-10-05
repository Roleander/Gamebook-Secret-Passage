import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planes y precios",
  description:
    "Compara los planes Free, Pro y Lifetime de Gamebook Secret Passage y elige cómo quieres crear tus librojuegos.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
