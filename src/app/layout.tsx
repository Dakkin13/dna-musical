import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DNA Musical",
    template: "%s · DNA Musical",
  },
  description:
    "Descubre tu ADN musical: conecta Spotify, analiza tus hábitos de escucha y genera un perfil visual único de tu identidad sonora.",
  keywords: ["música", "Spotify", "perfil musical", "géneros", "DNA", "ADN musical"],
  authors: [{ name: "DNA Musical" }],
  openGraph: {
    title: "DNA Musical",
    description: "Descubre tu ADN musical y compártelo con el mundo.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "DNA Musical",
    description: "Descubre tu ADN musical y compártelo con el mundo.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0a1e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-[#0f0a1e] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
