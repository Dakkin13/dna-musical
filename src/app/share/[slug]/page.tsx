import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { generateNarrative } from "@/lib/dna";
import DnaCard from "@/components/DnaCard";
import type { DnaData } from "@/types";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Params = Promise<{ slug: string }>;

interface ProfileRow {
  display_name: string;
  avatar_url: string | null;
  dna: DnaData;
  share_slug: string;
}

// ---------------------------------------------------------------------------
// Consulta memoizada con React.cache
// Tanto generateMetadata como el Page component la llaman; React garantiza
// que solo se ejecuta una vez por request (igual que fetch auto-memoization).
// ---------------------------------------------------------------------------

const getPublicProfile = cache(async (slug: string): Promise<ProfileRow | null> => {
  const { data, error } = await supabase
    .from("dna_profiles")
    .select("display_name, avatar_url, dna, share_slug")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("[share/[slug]] Supabase error:", error.message);
    return null;
  }

  return data as ProfileRow | null;
});

// ---------------------------------------------------------------------------
// generateMetadata — OG tags para Twitter / WhatsApp / iMessage
// ---------------------------------------------------------------------------

export async function generateMetadata(
  { params }: { params: Params }
): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);

  if (!profile) {
    return {
      title: "Perfil no encontrado · DNA Musical",
      description: "Este perfil de DNA Musical no existe o es privado.",
    };
  }

  const narrative = generateNarrative(profile.dna);
  const title = `${profile.display_name} es ${profile.dna.archetype} · DNA Musical`;
  // Descripción corta: primera oración de la narrativa
  const description = narrative.split(".")[0] + ".";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dnamusical.app";
  const pageUrl = `${siteUrl}/share/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "DNA Musical",
      type: "profile",
      locale: "es_ES",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: pageUrl,
    },
    // Evita que bots indexen páginas de perfil individuales
    robots: { index: false, follow: false },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function SharePage({ params }: { params: Params }) {
  const { slug } = await params;
  const profile = await getPublicProfile(slug);

  // notFound() lanza NEXT_REDIRECT internamente — no necesita return ni try/catch
  if (!profile) notFound();

  const narrative = generateNarrative(profile.dna);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav mínima — sin controles de sesión */}
      <nav className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link href="/" className="text-base font-bold tracking-tight">
          <span className="text-[#7F77DD]">DNA</span> Musical
        </Link>
        <span className="text-xs text-white/30">Perfil público</span>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-12 flex flex-col items-center gap-8">
        {/* Cabecera del perfil */}
        <div className="text-center space-y-2">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#7F77DD]/30 mx-auto mb-3"
            />
          )}
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            El ADN musical de
          </p>
          <h1 className="text-2xl font-extrabold">{profile.display_name}</h1>
          <p className="text-sm font-medium text-[#7F77DD]">
            {profile.dna.archetype}
          </p>
        </div>

        {/* DnaCard en modo lectura — sin id para evitar conflicto con el dashboard */}
        <div className="w-full">
          <DnaCard dna={profile.dna} narrative={narrative} />
        </div>

        {/* CTA — invitación a generar el propio */}
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <p className="text-xs text-white/30 max-w-xs leading-relaxed">
            ¿Tienes curiosidad por tu propio ADN musical?
          </p>
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#7F77DD] to-purple-500 px-8 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.97]"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            ¿Quieres ver el tuyo?
          </Link>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-white/20">
        DNA Musical · Hecho con ♥ y demasiadas playlists
      </footer>
    </div>
  );
}
