import { cookies } from "next/headers";
import {
  fetchSpotifyTopTracks,
  fetchSpotifyTopArtists,
  fetchSpotifyProfile,
  SpotifyError,
} from "@/lib/spotify";
import { fetchAudioFeatures, calculateDna } from "@/lib/dna";
import { supabase } from "@/lib/supabase";
import type { SpotifyTrack, TimeRange } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Mezcla los audio features dentro de los tracks (mutación de copia). */
function mergeFeatures(
  tracks: SpotifyTrack[],
  features: Awaited<ReturnType<typeof fetchAudioFeatures>>
): SpotifyTrack[] {
  const byId = new Map(features.map((f) => [f.id, f]));
  return tracks.map((t) => {
    const f = byId.get(t.id);
    if (!f) return t;
    return {
      ...t,
      energy: f.energy,
      valence: f.valence,
      danceability: f.danceability,
      tempo: f.tempo,
      acousticness: f.acousticness,
      instrumentalness: f.instrumentalness,
    };
  });
}

function errResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// POST /api/dna/calculate
// ---------------------------------------------------------------------------

export async function POST(): Promise<Response> {
  // 1. Leer el access_token de las cookies httpOnly
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return errResponse("No autenticado: falta el token de Spotify.", 401);
  }

  try {
    // 2. Perfil del usuario (necesitamos el spotify_id para el upsert)
    const profile = await fetchSpotifyProfile(accessToken);

    // 3. Top tracks para los 3 periodos en paralelo
    const timeRanges: TimeRange[] = ["short_term", "medium_term", "long_term"];

    const [tracksST, tracksMT, tracksLT] = await Promise.all(
      timeRanges.map((range) => fetchSpotifyTopTracks(accessToken, range, 50))
    );

    // 4. Top artistas para los 3 periodos en paralelo
    const [artistsST, artistsMT, artistsLT] = await Promise.all(
      timeRanges.map((range) => fetchSpotifyTopArtists(accessToken, range, 50))
    );

    // 5. Audio features solo de medium_term (representa el gusto estable)
    const mediumTrackIds = tracksMT.map((t) => t.id);
    const audioFeatures = await fetchAudioFeatures(mediumTrackIds, accessToken);
    const enrichedMediumTracks = mergeFeatures(tracksMT, audioFeatures);

    // Artistas combinados y deduplicados para más señal de géneros
    const allArtistIds = new Set<string>();
    const dedupedArtists = [...artistsST, ...artistsMT, ...artistsLT].filter(
      (a) => {
        if (allArtistIds.has(a.id)) return false;
        allArtistIds.add(a.id);
        return true;
      }
    );

    // 6. Calcular el DNA
    const dnaData = calculateDna(enrichedMediumTracks, dedupedArtists);

    // 7. Upsert en dna_profiles
    //    Primero comprobamos si ya existe un perfil para recuperar el slug previo.
    const _existingResult = await supabase
      .from("dna_profiles")
      .select("id, share_slug")
      .eq("spotify_id", profile.id)
      .maybeSingle();
    const existingProfile = _existingResult.data as
      | { id: string; share_slug: string }
      | null;

    const shareSlug = existingProfile?.share_slug ?? generateSlug();

    const { error: upsertError } = await supabase
      .from("dna_profiles")
      .upsert(
        {
          spotify_id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.images?.[0]?.url ?? null,
          dna: dnaData,
          share_slug: shareSlug,
          // Snapshot ligero de los periodos para uso futuro
          tracks_short_term: tracksST.map((t) => t.id),
          tracks_medium_term: tracksMT.map((t) => t.id),
          tracks_long_term: tracksLT.map((t) => t.id),
          updated_at: new Date().toISOString(),
        } as unknown as never,
        { onConflict: "spotify_id" }
      );

    if (upsertError) {
      console.error("[/api/dna/calculate] Supabase upsert error:", upsertError.message);
      return errResponse("Error al guardar el perfil de DNA.", 500);
    }

    // 8. Devolver el DNA calculado + metadatos mínimos
    return Response.json({
      dna: dnaData,
      shareSlug,
      displayName: profile.display_name,
      avatarUrl: profile.images?.[0]?.url ?? null,
    });
  } catch (err) {
    if (err instanceof SpotifyError) {
      // 401 → token expirado o revocado
      if (err.status === 401) {
        return errResponse(
          "Token de Spotify expirado. Vuelve a conectar tu cuenta.",
          401
        );
      }
      // 429 → rate limit
      if (err.status === 429) {
        return errResponse(
          "Demasiadas peticiones a Spotify. Espera unos segundos e inténtalo de nuevo.",
          429
        );
      }
      return errResponse(`Error de Spotify: ${err.message}`, err.status);
    }

    const message =
      err instanceof Error ? err.message : "Error interno del servidor.";
    console.error("[/api/dna/calculate] Unexpected error:", message);
    return errResponse(message, 500);
  }
}
