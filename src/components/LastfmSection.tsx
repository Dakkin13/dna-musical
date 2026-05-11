"use client";

import { useState, useEffect, useRef } from "react";
import type { LastfmCombinedResponse } from "@/types";

const LS_KEY = "lastfm_username";

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function EraTimeline({ eras }: { eras: LastfmCombinedResponse["eras"] }) {
  if (eras.length === 0) {
    return (
      <p className="text-xs text-white/30 italic">
        No hay suficiente historial para mostrar la evolución.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l border-[#7F77DD]/20 pl-4">
      {[...eras].reverse().map((era) => (
        <li key={era.year} className="pb-4 last:pb-0">
          {/* Punto en la línea de tiempo */}
          <span
            className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#7F77DD] bg-gray-950"
            aria-hidden
          />
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-mono font-bold text-[#7F77DD]">
              {era.year}
            </span>
            <span className="text-[10px] text-white/35 truncate">
              {era.topGenre}
            </span>
          </div>
          <p className="text-xs text-white/70 font-medium truncate">
            {era.topArtist}
          </p>
        </li>
      ))}
    </ol>
  );
}

function UserInfoBadge({ info }: { info: LastfmCombinedResponse["userInfo"] }) {
  const years = new Date().getFullYear() - new Date(info.registeredAt * 1000).getFullYear();
  return (
    <div className="rounded-xl border border-white/10 bg-white/4 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Logo Last.fm simplificado */}
        <span className="text-red-500 font-black text-sm leading-none">fm</span>
        <span className="text-xs font-semibold text-white/80">{info.name}</span>
      </div>
      <div className="flex gap-3 text-[10px] text-white/40">
        <span>
          <span className="text-white/70 font-medium">
            {info.playcount.toLocaleString()}
          </span>{" "}
          scrobbles
        </span>
        {years > 0 && (
          <span>
            <span className="text-white/70 font-medium">{years}</span> años
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LastfmSection
// ---------------------------------------------------------------------------

type Status = "idle" | "loading" | "success" | "error";

export default function LastfmSection() {
  const [username, setUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<LastfmCombinedResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fetchedFor = useRef<string | null>(null);

  // Carga el username guardado y dispara el fetch al montar
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      setUsername(saved);
    }
  }, []);

  useEffect(() => {
    if (!username || fetchedFor.current === username) return;
    fetchedFor.current = username;

    async function load() {
      setStatus("loading");
      setData(null);
      setErrorMsg("");

      try {
        const res = await fetch("/api/lastfm/top", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, period: "overall" }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? `Error ${res.status}`);
        }

        setData(json as LastfmCombinedResponse);
        setStatus("success");
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "No se pudo cargar el perfil."
        );
        setStatus("error");
      }
    }

    load();
  }, [username]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_KEY, trimmed);
    fetchedFor.current = null; // Permite refetch aunque sea el mismo nombre
    setUsername(trimmed);
  }

  function handleDisconnect() {
    localStorage.removeItem(LS_KEY);
    setUsername(null);
    setInputValue("");
    setData(null);
    setStatus("idle");
    fetchedFor.current = null;
  }

  // ── Sin usuario: formulario ──────────────────────────────────────────────

  if (!username) {
    return (
      <section className="w-full space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
            Conecta tu Last.fm
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            Enriquece tu DNA con años de historial musical.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tu usuario"
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-white/30 focus:border-[#7F77DD]/50 focus:outline-none focus:ring-1 focus:ring-[#7F77DD]/40"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="h-9 shrink-0 rounded-lg bg-red-600/80 px-3 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
          >
            Conectar
          </button>
        </form>
      </section>
    );
  }

  // ── Cargando ─────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <section className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-white/30">
            Last.fm
          </p>
          <span className="text-[10px] text-white/30">{username}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span
            className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-red-400 animate-spin"
            aria-hidden
          />
          Cargando historial…
        </div>
      </section>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (status === "error") {
    return (
      <section className="w-full space-y-2">
        <p className="text-xs text-red-400">{errorMsg}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchedFor.current = null;
              setStatus("idle");
              setUsername(username);
            }}
            className="text-[10px] text-white/40 underline hover:text-white/60"
          >
            Reintentar
          </button>
          <button
            onClick={handleDisconnect}
            className="text-[10px] text-white/40 underline hover:text-white/60"
          >
            Cambiar usuario
          </button>
        </div>
      </section>
    );
  }

  // ── Éxito: mostrar datos ──────────────────────────────────────────────────

  if (!data) return null;

  return (
    <section className="w-full space-y-5">
      {/* Info de usuario + desconectar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-white/30">
            Last.fm conectado
          </p>
          <button
            onClick={handleDisconnect}
            className="text-[10px] text-white/30 underline underline-offset-2 hover:text-white/60 transition-colors"
          >
            Desconectar
          </button>
        </div>
        <UserInfoBadge info={data.userInfo} />
      </div>

      {/* Separador */}
      <div className="border-t border-white/10" />

      {/* Tu evolución musical */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-white/30">
          Tu evolución musical
        </p>
        <EraTimeline eras={data.eras} />
      </div>

      {/* Top artistas del historial */}
      {data.topArtists.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/30">
            Más escuchados (historial)
          </p>
          <ol className="space-y-1.5">
            {data.topArtists.slice(0, 5).map((a, i) => (
              <li key={a.name} className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono text-white/25 w-3 text-right shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/75 truncate">
                    {a.name}
                  </p>
                  {a.tags[0] && (
                    <p className="text-[10px] text-white/30">{a.tags[0]}</p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/30 shrink-0">
                  {a.playcount.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
