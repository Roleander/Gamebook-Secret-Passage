import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://gamebook-secret-passage.vercel.app";
const SITE_NAME = "Gamebook Secret Passage";
const SITE_DESCRIPTION =
  "Forja librosjuegos que hipnotizan. Crea, edita y exporta a PDF/EPUB con detección de errores y estilo medieval.";
const OG_IMAGE =
  "https://0qd6kvwc4iqbiywd.public.blob.vercel-storage.com/logo/cmu5boi0i000010wkg0uerexs.jpg";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 512, height: 512, alt: "Logo de Secret Passage" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <I18nProvider>
          <Providers>
            <ThemeProvider>{children}</ThemeProvider>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
