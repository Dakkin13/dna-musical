"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  shareUrl: string;
}

export default function ActionButtons({ shareUrl }: Props) {
  const router = useRouter();
  const [recalculating, setRecalculating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  async function handleRecalculate() {
    setRecalculating(true);
    setRecalcError(null);

    try {
      const res = await fetch("/api/dna/calculate", { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      // Refresca los Server Components sin recargar la página completa
      router.refresh();
    } catch (err) {
      setRecalcError(
        err instanceof Error ? err.message : "No se pudo recalcular."
      );
    } finally {
      setRecalculating(false);
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: abre el enlace si el clipboard falla (navegadores sin permiso)
      window.open(shareUrl, "_blank");
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <button
        onClick={handleRecalculate}
        disabled={recalculating}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#7F77DD] px-4 text-sm font-semibold text-white transition-all hover:bg-[#6e66cc] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {recalculating ? (
          <>
            <span
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-hidden
            />
            Calculando…
          </>
        ) : (
          <>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
                clipRule="evenodd"
              />
            </svg>
            Recalcular DNA
          </>
        )}
      </button>

      <button
        onClick={handleShare}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-[0.97]"
      >
        {copied ? (
          <>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-emerald-400"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-emerald-400">¡Enlace copiado!</span>
          </>
        ) : (
          <>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.475l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
            </svg>
            Compartir perfil
          </>
        )}
      </button>

      {recalcError && (
        <p role="alert" className="text-xs text-red-400 text-center">
          {recalcError}
        </p>
      )}
    </div>
  );
}
