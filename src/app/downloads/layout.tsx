import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Descargas",
  description:
    "Descarga Gamebook Secret Passage para Windows, Mac y Linux: instalador, portable y versiones para terminal.",
  alternates: {
    canonical: "/downloads",
  },
};

export default function DownloadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
