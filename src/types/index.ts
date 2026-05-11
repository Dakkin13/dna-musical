// --- Spotify ---

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    release_date: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  popularity: number;
  // Audio features (enriquecidos desde /audio-features)
  energy?: number;        // 0–1
  valence?: number;       // 0–1, proxy de mood
  danceability?: number;  // 0–1
  tempo?: number;         // BPM
  acousticness?: number;  // 0–1
  instrumentalness?: number; // 0–1
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: { url: string; width: number; height: number }[];
}

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  country: string;
  product: string; // "premium" | "free"
}

// --- Last.fm ---

/** Forma cruda de artist en las respuestas de Last.fm (playcount es string) */
export interface LastfmArtist {
  name: string;
  playcount: string;
  mbid?: string;
  url: string;
  image: { "#text": string; size: string }[];
}

/** Forma cruda de track en las respuestas de Last.fm */
export interface LastfmTrack {
  name: string;
  artist: { name: string; mbid?: string };
  playcount: string;
  url: string;
  image: { "#text": string; size: string }[];
}

/** Artista procesado devuelto por fetchLastfmTopArtists (playcount numérico + tags) */
export interface LastfmTopArtist {
  name: string;
  playcount: number;
  tags: string[];
}

/** Track procesado devuelto por fetchLastfmTopTracks */
export interface LastfmTopTrack {
  name: string;
  artist: string;
  playcount: number;
}

/** Info de usuario de Last.fm */
export interface LastfmUserInfo {
  name: string;
  playcount: number;
  registeredAt: number; // Unix timestamp (segundos)
  country: string;
}

/** Una entrada del análisis histórico: año + artista + género dominante */
export interface ListeningEra {
  year: number;
  topArtist: string;
  topGenre: string;
}

/** Respuesta completa del endpoint /api/lastfm/top */
export interface LastfmCombinedResponse {
  topTracks: LastfmTopTrack[];
  topArtists: LastfmTopArtist[];
  userInfo: LastfmUserInfo;
  eras: ListeningEra[];
}

// --- Spotify Audio Features ---

export interface SpotifyAudioFeatures {
  id: string;
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  loudness: number;
  speechiness: number;
  liveness: number;
  key: number;
  mode: number;
  time_signature: number;
  duration_ms: number;
}

// --- DNA Musical ---

/** Género con su peso porcentual dentro del perfil (0–100) */
export interface GenreWeight {
  genre: string;
  /** Porcentaje de aparición sobre el total de géneros contados (0–100) */
  weight: number;
}

/** Todas las dimensiones del ADN musical. Valores numéricos en rango 0–100. */
export interface DnaData {
  /** Energía media (0 = muy tranquilo, 100 = muy intenso) */
  energy: number;

  /** Estado de ánimo (0 = melancólico/oscuro, 100 = eufórico/alegre) */
  mood: number;

  /** Bailabilidad media (0 = nada bailable, 100 = muy bailable) */
  danceability: number;

  /** Popularidad media de los artistas (0 = underground, 100 = mainstream global) */
  mainstreamness: number;

  /**
   * Diversidad de géneros (0 = escucha un solo género,
   * 100 = 15+ géneros distintos)
   */
  diversity: number;

  /**
   * Nostalgia (0 = solo música actual ≥2020,
   * 100 = mayormente música anterior a 1970)
   */
  nostalgia: number;

  /** Top 5 géneros con su peso porcentual */
  topGenres: GenreWeight[];

  /**
   * Época musical dominante en el perfil.
   * Ej: "2010s", "90s", "2000s", "Atemporal"
   */
  era: string;

  /**
   * Arquetipo de oyente inferido de las dimensiones.
   * Ej: "El Explorador Nocturno", "El Festivalero", "El Nostálgico Intenso"
   */
  archetype: string;
}

export interface DnaProfile {
  id: string;
  userId: string;
  /** Slug único para la URL pública, ej. "abc123" */
  slug: string;
  createdAt: string;
  updatedAt: string;
  dna: DnaData;
  /** Si el perfil es visible públicamente */
  isPublic: boolean;
  /** Nombre a mostrar (del perfil de Spotify) */
  displayName: string;
  avatarUrl?: string;
}

// --- API Responses ---

export interface ApiError {
  error: string;
  status: number;
}

export type TimeRange = "short_term" | "medium_term" | "long_term";
