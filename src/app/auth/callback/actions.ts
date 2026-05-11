"use server";

import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import type { SpotifyProfile } from "@/types";

// 30 días en segundos
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

export interface SaveSessionResult {
  success: true;
  userId: string;
}
export interface SaveSessionError {
  success: false;
  error: string;
}
export type SaveSessionResponse = SaveSessionResult | SaveSessionError;

/**
 * Server Action: guarda los tokens de Spotify en cookies httpOnly
 * y hace upsert del perfil del usuario en Supabase.
 *
 * Las cookies httpOnly no son accesibles desde JS del navegador,
 * por eso se escriben exclusivamente aquí (server-side).
 */
export async function saveSession(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  profile: SpotifyProfile
): Promise<SaveSessionResponse> {
  try {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set("spotify_access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn, // Spotify devuelve 3600 (1h)
    });

    cookieStore.set("spotify_refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // Upsert en la tabla 'profiles' usando el Spotify ID como clave estable.
    // ON CONFLICT (spotify_id) → actualiza los campos que pueden cambiar.
    const { data: _profileData, error } = await supabase
      .from("profiles")
      .upsert(
        {
          spotify_id: profile.id,
          display_name: profile.display_name,
          email: profile.email,
          avatar_url: profile.images?.[0]?.url ?? null,
          country: profile.country,
          spotify_product: profile.product,
          updated_at: new Date().toISOString(),
        } as unknown as never,
        { onConflict: "spotify_id" }
      )
      .select("id")
      .single();
    const data = _profileData as { id: string } | null;

    if (error) {
      console.error("[saveSession] Supabase error:", error.message);
      return { success: false, error: "Error al guardar el perfil de usuario" };
    }

    return { success: true, userId: data!.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[saveSession] Unexpected error:", message);
    return { success: false, error: message };
  }
}
