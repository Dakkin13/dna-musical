import type {
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAudioFeatures,
  DnaData,
  GenreWeight,
} from "@/types";
import { SpotifyError } from "./spotify";

const SPOTIFY_API = "https://api.spotify.com/v1";

// ---------------------------------------------------------------------------
// fetchAudioFeatures
// ---------------------------------------------------------------------------

/**
 * Obtiene los audio features de Spotify para un lote de tracks.
 * Spotify acepta un máximo de 100 IDs por llamada; si hay más, los batea.
 *
 * Tracks sin features (singles no analizados, podcasts) vienen como `null`
 * en la respuesta — los filtramos.
 */
export async function fetchAudioFeatures(
  trackIds: string[],
  token: string
): Promise<SpotifyAudioFeatures[]> {
  if (trackIds.length === 0) return [];

  const BATCH = 100;
  const results: SpotifyAudioFeatures[] = [];

  for (let i = 0; i < trackIds.length; i += BATCH) {
    const ids = trackIds.slice(i, i + BATCH).join(",");
    const res = await fetch(`${SPOTIFY_API}/audio-features?ids=${ids}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new SpotifyError(
        "Error al obtener audio features",
        res.status,
        "/audio-features"
      );
    }

    const data = (await res.json()) as {
      audio_features: (SpotifyAudioFeatures | null)[];
    };

    for (const f of data.audio_features) {
      if (f !== null) results.push(f);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Promedio de un array numérico; devuelve `fallback` si está vacío. */
function avg(values: number[], fallback = 50): number {
  if (values.length === 0) return fallback;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Redondea a un decimal y clampea entre 0 y 100. */
function score(raw: number): number {
  return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
}

/** Extrae el año (4 dígitos) de release_date, que puede ser "YYYY", "YYYY-MM" o "YYYY-MM-DD". */
function releaseYear(releaseDate: string): number | null {
  const match = releaseDate.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/** Convierte un año en puntuación de nostalgia (0–100). */
function yearToNostalgia(year: number): number {
  if (year >= 2020) return 0;
  if (year <= 1970) return 100;
  // Interpolación lineal: 2019→5, 1971→95
  return Math.round(((2019 - year) / (2019 - 1971)) * 90 + 5);
}

/** Convierte un año en etiqueta de era ("2020s", "2010s", "90s", …). */
function yearToEraLabel(year: number): string {
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "90s";
  if (year >= 1980) return "80s";
  if (year >= 1970) return "70s";
  return "Clásico";
}

// ---------------------------------------------------------------------------
// Top géneros
// ---------------------------------------------------------------------------

function buildTopGenres(artists: SpotifyArtist[]): GenreWeight[] {
  const counts = new Map<string, number>();

  for (const artist of artists) {
    for (const genre of artist.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return [];

  const total = [...counts.values()].reduce((s, v) => s + v, 0);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({
      genre,
      weight: Math.round((count / total) * 1000) / 10, // 1 decimal
    }));
}

// ---------------------------------------------------------------------------
// Era dominante
// ---------------------------------------------------------------------------

function dominantEra(tracks: SpotifyTrack[]): string {
  const eraCount = new Map<string, number>();

  for (const t of tracks) {
    const year = releaseYear(t.album.release_date);
    if (year === null) continue;
    const label = yearToEraLabel(year);
    eraCount.set(label, (eraCount.get(label) ?? 0) + 1);
  }

  if (eraCount.size === 0) return "Atemporal";

  // Si el top era tiene menos del 35% del total, el oyente es "Atemporal"
  const sorted = [...eraCount.entries()].sort((a, b) => b[1] - a[1]);
  const topCount = sorted[0][1];
  const totalTracks = [...eraCount.values()].reduce((s, v) => s + v, 0);

  if (topCount / totalTracks < 0.35) return "Atemporal";
  return sorted[0][0];
}

// ---------------------------------------------------------------------------
// Arquetipo
// ---------------------------------------------------------------------------

type Dimension = Pick<
  DnaData,
  "energy" | "mood" | "danceability" | "mainstreamness" | "diversity" | "nostalgia"
>;

/**
 * Infiere el arquetipo de oyente a partir de las dimensiones.
 * Cada arquetipo tiene un conjunto de condiciones ponderadas; gana el mayor score.
 */
function inferArchetype(d: Dimension): string {
  const candidates: { name: string; score: number }[] = [
    {
      name: "El Festivalero",
      score: (d.energy + d.danceability) / 2 - d.nostalgia * 0.3,
    },
    {
      name: "El Mainstream Dancer",
      score: (d.mainstreamness + d.danceability) / 2 - d.diversity * 0.2,
    },
    {
      name: "El Descubridor Underground",
      score: (100 - d.mainstreamness) * 0.6 + d.diversity * 0.4,
    },
    {
      name: "El Explorador Nocturno",
      score: d.diversity * 0.5 + (100 - d.mood) * 0.3 + d.energy * 0.2,
    },
    {
      name: "El Nostálgico Intenso",
      score: d.nostalgia * 0.7 + (100 - d.mood) * 0.3,
    },
    {
      name: "El Oyente Tranquilo",
      score: (100 - d.energy) * 0.5 + d.mood * 0.3 + (100 - d.danceability) * 0.2,
    },
    {
      name: "El Melómano Ecléctico",
      score: d.diversity * 0.6 + d.nostalgia * 0.2 + (100 - d.mainstreamness) * 0.2,
    },
  ];

  return candidates.sort((a, b) => b.score - a.score)[0].name;
}

// ---------------------------------------------------------------------------
// calculateDna  (función principal)
// ---------------------------------------------------------------------------

/**
 * Calcula el ADN musical a partir de los top tracks y artistas.
 * Los tracks deben estar enriquecidos con audio features antes de llamar
 * a esta función (usa `fetchAudioFeatures` y mezcla los campos en los tracks).
 */
export function calculateDna(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyArtist[]
): DnaData {
  // --- Audio features (usan los campos opcionales de SpotifyTrack) ---
  const withEnergy = topTracks.filter((t) => t.energy != null);
  const withValence = topTracks.filter((t) => t.valence != null);
  const withDance = topTracks.filter((t) => t.danceability != null);

  const energy = score(avg(withEnergy.map((t) => t.energy! * 100)));
  const mood = score(avg(withValence.map((t) => t.valence! * 100)));
  const danceability = score(avg(withDance.map((t) => t.danceability! * 100)));

  // --- Mainstreamness: promedio de popularity de los artistas ---
  const mainstreamness = score(avg(topArtists.map((a) => a.popularity)));

  // --- Diversity: géneros únicos normalizados (1 → 0, 15+ → 100) ---
  const uniqueGenres = new Set(topArtists.flatMap((a) => a.genres)).size;
  // Clamp entre 1 y 15, luego normalizar
  const diversityRaw = Math.min(Math.max(uniqueGenres - 1, 0) / 14, 1) * 100;
  const diversity = score(diversityRaw);

  // --- Nostalgia: basada en años de lanzamiento ---
  const nostalgiaScores = topTracks
    .map((t) => releaseYear(t.album.release_date))
    .filter((y): y is number => y !== null)
    .map(yearToNostalgia);
  const nostalgia = score(avg(nostalgiaScores, 0));

  // --- Top géneros ---
  const topGenres = buildTopGenres(topArtists);

  // --- Era dominante ---
  const era = dominantEra(topTracks);

  // --- Arquetipo ---
  const archetype = inferArchetype({
    energy,
    mood,
    danceability,
    mainstreamness,
    diversity,
    nostalgia,
  });

  return {
    energy,
    mood,
    danceability,
    mainstreamness,
    diversity,
    nostalgia,
    topGenres,
    era,
    archetype,
  };
}

// ---------------------------------------------------------------------------
// generateNarrative
// ---------------------------------------------------------------------------

/** Selecciona el descriptor más apropiado según un umbral. */
function tier(value: number, low: string, mid: string, high: string): string {
  if (value < 35) return low;
  if (value < 65) return mid;
  return high;
}

/**
 * Genera una descripción narrativa de 2-3 frases del perfil del oyente.
 * El texto varía según las dimensiones dominantes de su ADN.
 */
export function generateNarrative(dna: DnaData): string {
  const energyDesc = tier(
    dna.energy,
    "música tranquila y contemplativa",
    "sonidos equilibrados",
    "tracks de alta energía"
  );
  const moodDesc = tier(
    dna.mood,
    "con un tono melancólico y profundo",
    "con un tono neutro y versátil",
    "con un tono alegre y eufórico"
  );
  const danceDesc = tier(
    dna.danceability,
    "que no invitan especialmente a bailar",
    "con ritmo moderado",
    "muy bailables"
  );

  const mainstreamDesc =
    dna.mainstreamness >= 65
      ? "Sigues de cerca las tendencias globales y disfrutas de los grandes artistas del momento."
      : dna.mainstreamness <= 35
      ? "Tus gustos se alejan del mainstream: prefieres artistas con menor exposición masiva."
      : "Mezclas artistas conocidos con descubrimientos más underground.";

  const diversityDesc =
    dna.diversity >= 65
      ? `Tu oído es omnívoro: abarcas ${dna.topGenres.length > 0 ? dna.topGenres.map((g) => g.genre).slice(0, 3).join(", ") : "múltiples géneros"} y más.`
      : dna.diversity <= 35
      ? `Eres fiel a tu estilo: ${dna.topGenres[0]?.genre ?? "tu género favorito"} domina claramente tu escucha.`
      : `Tu escucha combina géneros con cierta coherencia, con ${dna.topGenres[0]?.genre ?? "un género"} como núcleo.`;

  const nostalgiaDesc =
    dna.nostalgia >= 65
      ? `La música de los ${dna.era} tiene un peso especial en ti.`
      : dna.nostalgia <= 25
      ? "Vives el presente musical: la mayoría de lo que escuchas es reciente."
      : `La era ${dna.era} convive con lanzamientos actuales en tu playlist.`;

  // Frase 1: energía + mood + bailabilidad
  const sentence1 = `Tu ADN musical está dominado por ${energyDesc} ${moodDesc} y ${danceDesc}.`;

  // Frase 2: posición mainstream / diversidad
  const sentence2 = `${mainstreamDesc} ${diversityDesc}`;

  // Frase 3: nostalgia / era + arquetipo
  const sentence3 = `${nostalgiaDesc} Todo eso te convierte en ${dna.archetype}.`;

  return [sentence1, sentence2, sentence3].join(" ");
}
