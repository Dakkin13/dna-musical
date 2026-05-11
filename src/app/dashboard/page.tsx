import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchSpotifyProfile, SpotifyError } from "@/lib/spotify";
import { generateNarrative } from "@/lib/dna";
import { supabase } from "@/lib/supabase";
import DnaCard from "@/components/DnaCard";
import ActionButtons from "./ActionButtons";
import LastfmSection from "@/components/LastfmSection";
import { fetchSpotifyTopArtists } from "@/lib/spotify";
import type { DnaData, SpotifyArtist } from "@/types";

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DnaLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6">
      <div className="relative flex items-center justify-center">
        {/* Anillo exterior */}
        <div className="absolute h-20 w-20 rounded-full border-4 border-[#7F77DD]/20 border-t-[#7F77DD] animate-spin" />
        {/* Anillo interior contrarrotante */}
        <div className="h-12 w-12 rounded-full border-4 border-purple-500/10 border-b-purple-400 animate-spin [animation-direction:reverse] [animation-duration:0.8s]" />
        <span className="absolute text-lg select-none" aria-hidden>
          🧬
        </span>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-white font-semibold text-lg">
          Analizando tu ADN musical
        </p>
        <p className="text-white/40 text-sm">
          Procesando más de 50 canciones y artistas…
        </p>
      </div>

      {/* Esqueleto de la tarjeta */}
      <div className="mt-4 w-full max-w-xl rounded-2xl border border-white/10 bg-gray-900 p-6 space-y-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-8 w-56 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-4/5 rounded bg-white/10" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-white/10" />
              <div className="h-2 w-full rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardContent — async Server Component
// ---------------------------------------------------------------------------

async function DashboardContent() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  // redirect() lanzará NEXT_REDIRECT — debe estar fuera del try/catch
  if (!accessToken) redirect("/");

  // Obtenemos el perfil para identificar al usuario. Si el token expiró,
  // redirigimos fuera del try/catch (ver nota de la doc).
  let shouldRedirect = false;
  let profile: Awaited<ReturnType<typeof fetchSpotifyProfile>> | null = null;

  try {
    profile = await fetchSpotifyProfile(accessToken);
  } catch (err) {
    if (err instanceof SpotifyError && err.status === 401) {
      shouldRedirect = true;
    } else {
      throw err;
    }
  }

  if (shouldRedirect || !profile) redirect("/?error=session_expired");

  // Comprueba si hay un DNA fresco en caché (< 24 h)
  const { data: cached } = await supabase
    .from("dna_profiles")
    .select("dna, share_slug, updated_at")
    .eq("spotify_id", profile.id)
    .maybeSingle();

  const isFresh =
    cached !== null &&
    Date.now() - new Date(cached.updated_at as string).getTime() <
      CACHE_MAX_AGE_MS;

  let dnaData: DnaData;
  let shareSlug: string;

  if (isFresh && cached) {
    dnaData = cached.dna as DnaData;
    shareSlug = cached.share_slug as string;
  } else {
    // Calcula un DNA fresco llamando al Route Handler interno.
    // Reenviamos las cookies para que el handler pueda leer el access_token.
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

    const res = await fetch(`${siteUrl}/api/dna/calculate`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401) redirect("/?error=session_expired");
      // Para otros errores, lanzamos para que Next.js muestre error.tsx si existe
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `DNA calculation failed (${res.status})`);
    }

    const result = await res.json();
    dnaData = result.dna as DnaData;
    shareSlug = result.shareSlug as string;
  }

  const narrative = generateNarrative(dnaData);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const shareUrl = `${siteUrl}/share/${shareSlug}`;
  const avatarUrl = profile.images?.[0]?.url ?? null;

  // Top 3 artistas para mostrar con imagen en la DnaCard
  let topArtists: SpotifyArtist[] = [];
  try {
    topArtists = await fetchSpotifyTopArtists(accessToken, "medium_term", 3);
  } catch {
    // No crítico: la card se muestra sin la sección de artistas
  }
  const artistSnippets = topArtists.map((a) => ({
    name: a.name,
    imageUrl: a.images?.[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <span className="text-base font-bold tracking-tight">
          <span className="text-[#7F77DD]">DNA</span> Musical
        </span>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* ── Columna izquierda ── */}
          <aside className="flex shrink-0 flex-col items-center gap-6 lg:w-56 lg:items-start lg:sticky lg:top-10">
            {/* Avatar */}
            <div className="relative">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt={profile.display_name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-[#7F77DD]/40"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#7F77DD]/20 text-3xl font-bold text-[#7F77DD]">
                  {profile.display_name[0]?.toUpperCase()}
                </div>
              )}
              {/* Badge de Spotify */}
              <span
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB954]"
                aria-label="Conectado con Spotify"
              >
                <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </span>
            </div>

            {/* Nombre y arquetipo */}
            <div className="text-center lg:text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">
                Tu ADN Musical
              </p>
              <h1 className="text-lg font-bold leading-tight">
                {profile.display_name}
              </h1>
              <p className="mt-1 text-sm font-medium text-[#7F77DD]">
                {dnaData.archetype}
              </p>
            </div>

            {/* Botones de acción */}
            <ActionButtons shareUrl={shareUrl} />

            {/* Separador */}
            <div className="w-full border-t border-white/10" />

            {/* Last.fm: conexión + evolución musical */}
            <LastfmSection />
          </aside>

          {/* ── Columna derecha ── */}
          <main className="min-w-0 flex-1">
            <DnaCard dna={dnaData} narrative={narrative} artists={artistSnippets} />
          </main>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — envuelve el contenido en Suspense
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <Suspense fallback={<DnaLoadingSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
