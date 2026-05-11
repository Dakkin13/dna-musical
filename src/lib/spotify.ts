/**
 * Spotify OAuth 2.0 con PKCE + helpers de API.
 *
 * PKCE: el code_verifier se genera en el browser y se guarda en sessionStorage
 * hasta que el callback lo consume para canjear el code. Nunca sale del cliente.
 *
 * Los access/refresh tokens los gestiona el servidor (cookies HttpOnly via
 * Route Handlers); este módulo solo hace el intercambio inicial y los fetch.
 */

import type { SpotifyTrack, SpotifyArtist, SpotifyProfile, TimeRange } from "@/types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";
const SESSION_KEY_VERIFIER = "spotify_code_verifier";

const SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-read-private",
  "user-read-email",
].join(" ");

// ---------------------------------------------------------------------------
// Error tipado
// ---------------------------------------------------------------------------

export class SpotifyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = "SpotifyError";
  }
}

// ---------------------------------------------------------------------------
// PKCE helpers  (Web Crypto API — disponible en browser y Node 18+ / Edge)
// ---------------------------------------------------------------------------

/**
 * Genera un code_verifier aleatorio de 64 caracteres (A-Z a-z 0-9 - _ . ~).
 * RFC 7636 §4.1 recomienda entre 43 y 128 caracteres.
 */
export function generateCodeVerifier(): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

/**
 * Calcula S256: SHA-256 del verifier codificado en base64url sin padding.
 * Spec: RFC 7636 §4.2.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  // base64url: sustituir +→- /→_ y quitar =
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// OAuth — URL de autorización
// ---------------------------------------------------------------------------

/**
 * Construye la URL de autorización de Spotify con PKCE.
 * Guarda el verifier en sessionStorage para recuperarlo en el callback.
 *
 * Debe llamarse solo en el browser (`typeof window !== "undefined"`).
 */
export async function getSpotifyAuthUrl(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new SpotifyError(
      "Faltan variables de entorno: NEXT_PUBLIC_SPOTIFY_CLIENT_ID / NEXT_PUBLIC_SPOTIFY_REDIRECT_URI",
      500
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Persiste el verifier para el paso de intercambio en el callback
  sessionStorage.setItem(SESSION_KEY_VERIFIER, verifier);

  const state = generateCodeVerifier().slice(0, 16); // anti-CSRF

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
}

// ---------------------------------------------------------------------------
// OAuth — intercambio y renovación de tokens
// ---------------------------------------------------------------------------

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;       // segundos (normalmente 3600)
  refresh_token?: string;   // solo en el primer intercambio
}

/**
 * Canjea el `code` del callback por un access_token + refresh_token.
 * El `verifier` lo lee de sessionStorage si no se pasa explícitamente.
 */
export async function exchangeCodeForToken(
  code: string,
  verifier?: string
): Promise<SpotifyTokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new SpotifyError("Faltan variables de entorno de Spotify", 500);
  }

  const codeVerifier =
    verifier ?? sessionStorage.getItem(SESSION_KEY_VERIFIER) ?? "";

  if (!codeVerifier) {
    throw new SpotifyError(
      "code_verifier no encontrado en sessionStorage",
      400,
      "/api/token"
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new SpotifyError(
      err.error_description ?? "Error al obtener el token",
      res.status,
      "/api/token"
    );
  }

  // Limpia el verifier una vez usado — no debe reutilizarse
  sessionStorage.removeItem(SESSION_KEY_VERIFIER);

  return res.json() as Promise<SpotifyTokenResponse>;
}

/**
 * Renueva el access_token usando el refresh_token.
 * PKCE no requiere client_secret para el refresh.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<SpotifyTokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

  if (!clientId) {
    throw new SpotifyError("Falta NEXT_PUBLIC_SPOTIFY_CLIENT_ID", 500);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new SpotifyError(
      err.error_description ?? "Error al renovar el token",
      res.status,
      "/api/token (refresh)"
    );
  }

  return res.json() as Promise<SpotifyTokenResponse>;
}

// ---------------------------------------------------------------------------
// Helpers internos de fetch
// ---------------------------------------------------------------------------

async function spotifyGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new SpotifyError(
      err.error?.message ?? `Error en ${path}`,
      res.status,
      path
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Endpoints de la API de Spotify
// ---------------------------------------------------------------------------

interface TopItemsResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
}

/**
 * Obtiene los top tracks del usuario.
 * @param token  access_token de Spotify
 * @param timeRange  ventana temporal (short=4sem, medium=6m, long=todo el tiempo)
 * @param limit  número de tracks (1-50, por defecto 50)
 */
export async function fetchSpotifyTopTracks(
  token: string,
  timeRange: TimeRange = "medium_term",
  limit = 50
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    time_range: timeRange,
    limit: String(Math.min(limit, 50)),
    offset: "0",
  });

  const data = await spotifyGet<TopItemsResponse<SpotifyTrack>>(
    token,
    `/me/top/tracks?${params}`
  );

  return data.items;
}

/**
 * Obtiene los top artistas del usuario.
 * @param token  access_token de Spotify
 * @param timeRange  ventana temporal
 * @param limit  número de artistas (1-50, por defecto 50)
 */
export async function fetchSpotifyTopArtists(
  token: string,
  timeRange: TimeRange = "medium_term",
  limit = 50
): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({
    time_range: timeRange,
    limit: String(Math.min(limit, 50)),
    offset: "0",
  });

  const data = await spotifyGet<TopItemsResponse<SpotifyArtist>>(
    token,
    `/me/top/artists?${params}`
  );

  return data.items;
}

/**
 * Obtiene el perfil público del usuario autenticado.
 */
export async function fetchSpotifyProfile(
  token: string
): Promise<SpotifyProfile> {
  return spotifyGet<SpotifyProfile>(token, "/me");
}
