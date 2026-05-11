"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  exchangeCodeForToken,
  fetchSpotifyProfile,
  SpotifyError,
} from "@/lib/spotify";
import { saveSession } from "./actions";

interface Props {
  code: string | undefined;
  spotifyError: string | undefined;
}

type Status = "loading" | "error";

export default function CallbackHandler({ code, spotifyError }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Ref para que el efecto solo corra una vez aunque React lo monte dos veces
  // en StrictMode (desarrollo).
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Spotify devuelve ?error=access_denied cuando el usuario cancela
    if (spotifyError) {
      setErrorMessage(
        spotifyError === "access_denied"
          ? "Cancelaste la autorización de Spotify."
          : `Spotify devolvió un error: ${spotifyError}`
      );
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("No se recibió el código de autorización de Spotify.");
      setStatus("error");
      return;
    }

    async function handleCallback() {
      try {
        // 1. Recupera el verifier que guardamos antes de redirigir a Spotify
        const verifier = sessionStorage.getItem("spotify_code_verifier");
        if (!verifier) {
          throw new Error(
            "Sesión expirada: no se encontró el code_verifier. Vuelve a intentarlo."
          );
        }

        // 2. Canjea el code por tokens
        const tokenData = await exchangeCodeForToken(code!, verifier);

        // 3. Obtiene el perfil del usuario con el token fresco
        const profile = await fetchSpotifyProfile(tokenData.access_token);

        // 4. Guarda tokens en cookies httpOnly y el perfil en Supabase (Server Action)
        const result = await saveSession(
          tokenData.access_token,
          tokenData.refresh_token ?? "",
          tokenData.expires_in,
          profile
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        // 5. Redirige al dashboard
        router.replace("/dashboard");
      } catch (err) {
        if (err instanceof SpotifyError) {
          setErrorMessage(
            err.status === 400
              ? "El código de autorización es inválido o ya fue usado. Vuelve a intentarlo."
              : `Error de Spotify (${err.status}): ${err.message}`
          );
        } else {
          setErrorMessage(
            err instanceof Error ? err.message : "Ocurrió un error inesperado."
          );
        }
        setStatus("error");
      }
    }

    handleCallback();
  }, [code, spotifyError, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        {/* Spinner */}
        <div
          className="h-14 w-14 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin"
          role="status"
          aria-label="Procesando..."
        />
        <div className="text-center">
          <p className="text-lg font-semibold text-white">
            Analizando tu música
          </p>
          <p className="mt-1 text-sm text-white/50">
            Conectando con Spotify…
          </p>
        </div>
      </div>
    );
  }

  // status === "error"
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-3xl">
        ✗
      </div>
      <div>
        <h1 className="text-xl font-bold text-white">Algo salió mal</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">{errorMessage}</p>
      </div>
      <a
        href="/"
        className="mt-2 inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
      >
        ← Volver al inicio
      </a>
    </div>
  );
}
