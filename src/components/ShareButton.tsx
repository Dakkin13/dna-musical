"use client";

import { useState } from "react";

interface Props {
  shareUrl: string;
}

type DownloadState = "idle" | "capturing" | "error";

export default function ShareButton({ shareUrl }: Props) {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [copied, setCopied] = useState(false);

  // ── Descargar imagen ────────────────────────────────────────────────────

  async function handleDownload() {
    const card = document.getElementById("dna-card");
    if (!card) {
      console.error("ShareButton: elemento #dna-card no encontrado");
      return;
    }

    setDownloadState("capturing");

    try {
      // Importación dinámica: html2canvas no es compatible con SSR
      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(card as HTMLElement, {
        backgroundColor: "#0f0a1e",
        scale: 2,             // Resolución 2× para pantallas retina
        useCORS: true,        // Necesario para imágenes de Spotify (dominio externo)
        logging: false,
        removeContainer: true,
      });

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setDownloadState("error");
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "mi-dna-musical.png";
          a.click();
          URL.revokeObjectURL(url);
          setDownloadState("idle");
        },
        "image/png"
      );
    } catch (err) {
      console.error("ShareButton: error al capturar la imagen", err);
      setDownloadState("error");
      // Vuelve a idle tras 3s para que el usuario pueda reintentar
      setTimeout(() => setDownloadState("idle"), 3000);
    }
  }

  // ── Copiar enlace ───────────────────────────────────────────────────────

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback para browsers que bloquean clipboard sin interacción previa
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const isCapturing = downloadState === "capturing";
  const isError = downloadState === "error";

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Descargar imagen */}
      <button
        onClick={handleDownload}
        disabled={isCapturing}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Descargar DNA card como imagen PNG"
      >
        {isCapturing ? (
          <>
            <span
              className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white/70 animate-spin"
              aria-hidden
            />
            Capturando…
          </>
        ) : isError ? (
          <>
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-red-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span className="text-red-400">Error al capturar</span>
          </>
        ) : (
          <>
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Descargar imagen
          </>
        )}
      </button>

      {/* Copiar enlace + toast */}
      <div className="relative">
        <button
          onClick={handleCopy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-[0.97]"
          aria-label="Copiar enlace del perfil al portapapeles"
        >
          {copied ? (
            <>
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-400">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              <span className="text-emerald-400">Enlace copiado ✓</span>
            </>
          ) : (
            <>
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .792l6.733 3.367a2.5 2.5 0 1 1-.671 1.341l-6.733-3.367a2.5 2.5 0 1 1 0-3.475l6.733-3.366A2.52 2.52 0 0 1 13 4.5Z" />
              </svg>
              Copiar enlace
            </>
          )}
        </button>

        {/* Toast flotante — se monta encima del botón con animación CSS */}
        <div
          role="status"
          aria-live="polite"
          className={[
            "pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2",
            "rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg",
            "transition-all duration-200",
            copied
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-1",
          ].join(" ")}
        >
          Enlace copiado ✓
        </div>
      </div>
    </div>
  );
}
