import type {
  LastfmTopTrack,
  LastfmTopArtist,
  LastfmUserInfo,
  ListeningEra,
} from "@/types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export type LastfmPeriod = "overall" | "12month" | "3month" | "6month" | "1month" | "7day";

// ---------------------------------------------------------------------------
// Error tipado
// ---------------------------------------------------------------------------

export class LastfmError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly method?: string
  ) {
    super(message);
    this.name = "LastfmError";
  }
}

// ---------------------------------------------------------------------------
// Base fetcher
// ---------------------------------------------------------------------------

async function lastfmGet<T>(
  method: string,
  params: Record<string, string>
): Promise<T> {
  const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
  if (!apiKey) {
    throw new LastfmError("Falta NEXT_PUBLIC_LASTFM_API_KEY", 0, method);
  }

  const url = new URL(BASE_URL);
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    // Last.fm no envía Cache-Control útil; revalidamos cada hora
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new LastfmError(`HTTP ${res.status}`, res.status, method);
  }

  const data = await res.json();

  // Last.fm devuelve { error: 6, message: "User not found" } en el body con HTTP 200
  if (data.error) {
    throw new LastfmError(data.message ?? "Error de Last.fm", data.error, method);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Helper: primer tag de un artista (para inferir género)
// ---------------------------------------------------------------------------

async function fetchArtistTopTag(artistName: string): Promise<string> {
  try {
    const data = await lastfmGet<{
      toptags: { tag: { name: string; count: string }[] };
    }>("artist.getTopTags", { artist: artistName });

    // Filtra tags genéricos que no aportan información de género
    const skipTags = new Set(["seen live", "under 2000 listeners", "favorites", "favourite"]);
    const useful = (data.toptags?.tag ?? []).find(
      (t) => !skipTags.has(t.name.toLowerCase())
    );
    return useful?.name ?? "Desconocido";
  } catch {
    return "Desconocido";
  }
}

// ---------------------------------------------------------------------------
// fetchLastfmTopTracks
// ---------------------------------------------------------------------------

/**
 * Devuelve los top tracks del usuario para el periodo indicado.
 * Last.fm devuelve playcount como string — lo convertimos a number.
 */
export async function fetchLastfmTopTracks(
  username: string,
  period: LastfmPeriod = "overall",
  limit = 50
): Promise<LastfmTopTrack[]> {
  const data = await lastfmGet<{
    toptracks: {
      track: {
        name: string;
        playcount: string;
        artist: { name: string };
      }[];
    };
  }>("user.getTopTracks", {
    user: username,
    period,
    limit: String(limit),
  });

  return (data.toptracks?.track ?? []).map((t) => ({
    name: t.name,
    artist: t.artist.name,
    playcount: parseInt(t.playcount, 10) || 0,
  }));
}

// ---------------------------------------------------------------------------
// fetchLastfmTopArtists
// ---------------------------------------------------------------------------

/**
 * Devuelve los top artistas con sus tags (género) obtenidos en paralelo
 * para los primeros 5 artistas. El resto solo lleva name y playcount.
 */
export async function fetchLastfmTopArtists(
  username: string,
  period: LastfmPeriod = "overall",
  limit = 20
): Promise<LastfmTopArtist[]> {
  const data = await lastfmGet<{
    topartists: {
      artist: { name: string; playcount: string }[];
    };
  }>("user.getTopArtists", {
    user: username,
    period,
    limit: String(limit),
  });

  const raw = data.topartists?.artist ?? [];

  // Enriquece solo los primeros 5 con tags (para no saturar la API)
  const TOP_WITH_TAGS = 5;
  const tagResults = await Promise.all(
    raw.slice(0, TOP_WITH_TAGS).map((a) => fetchArtistTopTag(a.name))
  );

  return raw.map((a, i) => ({
    name: a.name,
    playcount: parseInt(a.playcount, 10) || 0,
    tags: i < TOP_WITH_TAGS ? [tagResults[i]] : [],
  }));
}

// ---------------------------------------------------------------------------
// fetchLastfmUserInfo
// ---------------------------------------------------------------------------

export async function fetchLastfmUserInfo(
  username: string
): Promise<LastfmUserInfo> {
  const data = await lastfmGet<{
    user: {
      name: string;
      playcount: string;
      registered: { unixtime: string };
      country: string;
    };
  }>("user.getInfo", { user: username });

  const u = data.user;
  return {
    name: u.name,
    playcount: parseInt(u.playcount, 10) || 0,
    registeredAt: parseInt(u.registered.unixtime, 10) || 0,
    country: u.country,
  };
}

// ---------------------------------------------------------------------------
// calculateListeningEras
// ---------------------------------------------------------------------------

/**
 * Analiza la evolución musical del usuario año a año.
 *
 * Algoritmo:
 * 1. Obtiene la lista de semanas disponibles (user.getWeeklyChartList)
 * 2. Agrupa por año y elige la semana del pico de diciembre de cada año
 * 3. Para cada año llama a user.getWeeklyTrackChart y extrae el top artista
 * 4. Llama a artist.getTopTags para inferir el género
 *
 * El número de llamadas es proporcional a los años de historia (máx ~15 años).
 */
export async function calculateListeningEras(
  username: string
): Promise<ListeningEra[]> {
  // 1. Lista de todas las semanas disponibles para este usuario
  const chartListData = await lastfmGet<{
    weeklychartlist: { chart: { from: string; to: string }[] };
  }>("user.getWeeklyChartList", { user: username });

  const charts = chartListData.weeklychartlist?.chart ?? [];
  if (charts.length === 0) return [];

  // 2. Agrupar por año y seleccionar la semana de diciembre (semana más tardía)
  const byYear = new Map<number, { from: string; to: string }>();
  for (const chart of charts) {
    const year = new Date(parseInt(chart.from, 10) * 1000).getFullYear();
    // Sobrescribe — al recorrer en orden, queda la semana más reciente del año
    byYear.set(year, chart);
  }

  // Años ordenados ascendentemente, excluir el año actual (datos incompletos)
  const currentYear = new Date().getFullYear();
  const years = [...byYear.keys()]
    .filter((y) => y < currentYear)
    .sort((a, b) => a - b);

  // 3. Para cada año, obtener top artista y su género
  const eras: ListeningEra[] = [];

  for (const year of years) {
    const week = byYear.get(year)!;
    try {
      const chartData = await lastfmGet<{
        weeklytrackchart: {
          track: { artist: { "#text": string } }[];
        };
      }>("user.getWeeklyTrackChart", {
        user: username,
        from: week.from,
        to: week.to,
      });

      const topTrack = chartData.weeklytrackchart?.track?.[0];
      if (!topTrack) continue;

      const topArtist = topTrack.artist["#text"];
      const topGenre = await fetchArtistTopTag(topArtist);

      eras.push({ year, topArtist, topGenre });
    } catch {
      // Semana sin datos — continuamos con la siguiente
      continue;
    }
  }

  return eras;
}
