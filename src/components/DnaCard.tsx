"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { DnaData } from "@/types";

// ---------------------------------------------------------------------------
// Tipos de props
// ---------------------------------------------------------------------------

export interface ArtistSnippet {
  name: string;
  imageUrl?: string;
}

export interface DnaCardProps {
  dna: DnaData;
  narrative: string;
  /** Top artistas con imagen (opcional — la sección se omite si está vacío) */
  artists?: ArtistSnippet[];
}

// ---------------------------------------------------------------------------
// Datos estáticos de configuración
// ---------------------------------------------------------------------------

const ARCHETYPE_EMOJI: Record<string, string> = {
  "El Festivalero": "🎪",
  "El Mainstream Dancer": "💃",
  "El Descubridor Underground": "🔍",
  "El Explorador Nocturno": "🌙",
  "El Nostálgico Intenso": "📼",
  "El Oyente Tranquilo": "🌊",
  "El Melómano Ecléctico": "🎭",
};

const RADAR_LABELS: { key: keyof Pick<DnaData, "energy" | "mood" | "danceability" | "mainstreamness" | "diversity" | "nostalgia">; label: string }[] = [
  { key: "energy",        label: "Energía"    },
  { key: "mood",          label: "Mood"       },
  { key: "danceability",  label: "Baile"      },
  { key: "mainstreamness",label: "Popular"    },
  { key: "diversity",     label: "Diversidad" },
  { key: "nostalgia",     label: "Nostalgia"  },
];

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

/** Barra horizontal de género con porcentaje. */
function GenreBar({ genre, weight, max }: { genre: string; weight: number; max: number }) {
  const pct = Math.round((weight / max) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-white/70 capitalize">{genre}</span>
        <span className="text-xs font-mono text-white/40">{weight}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7F77DD] to-purple-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Avatar circular de artista. */
function ArtistAvatar({ name, imageUrl }: ArtistSnippet) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-[#7F77DD]/30"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7F77DD]/20 text-xl font-bold text-[#7F77DD]">
          {name[0]?.toUpperCase()}
        </div>
      )}
      <span className="text-xs text-white/60 max-w-[72px] leading-tight line-clamp-2">
        {name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DnaCard
// ---------------------------------------------------------------------------

export default function DnaCard({ dna, narrative, artists = [] }: DnaCardProps) {
  const emoji = ARCHETYPE_EMOJI[dna.archetype] ?? "🎵";
  const radarData = RADAR_LABELS.map(({ key, label }) => ({
    subject: label,
    value: dna[key],
  }));
  const maxGenreWeight = dna.topGenres[0]?.weight ?? 1;

  return (
    <div
      id="dna-card"
      className="relative w-full max-w-[420px] mx-auto rounded-3xl overflow-hidden border border-white/10"
      style={{
        background:
          "linear-gradient(160deg, #0f0a1e 0%, #130d28 40%, #0d1020 100%)",
      }}
    >
      {/* Glow decorativo en la esquina superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(127,119,221,0.6) 0%, transparent 70%)",
        }}
      />

      <div className="relative px-6 pt-8 pb-6 space-y-6">
        {/* ── 1. Header: arquetipo ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#7F77DD]/60 mb-1">
              Tu arquetipo musical
            </p>
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight">
              <span className="mr-2">{emoji}</span>
              {dna.archetype}
            </h2>
          </div>
          {/* Era badge */}
          <div className="shrink-0 rounded-full border border-[#7F77DD]/40 bg-[#7F77DD]/10 px-4 py-1.5 text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#7F77DD]/60 leading-none mb-0.5">
              Era
            </p>
            <p className="text-base font-black text-[#7F77DD] leading-none">
              {dna.era}
            </p>
          </div>
        </div>

        {/* ── 2. Radar chart ── */}
        <div className="rounded-2xl border border-white/8 bg-white/3 px-2 py-4">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid
                gridType="polygon"
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="0"
              />
              <PolarAngleAxis
                dataKey="subject"
                tick={{
                  fill: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              />
              {/* Oculta las etiquetas de radio pero mantiene el dominio 0-100 */}
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                dataKey="value"
                stroke="#7F77DD"
                strokeWidth={2}
                fill="#7F77DD"
                fillOpacity={0.22}
                dot={{ fill: "#7F77DD", r: 3, strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* ── 3. Top géneros ── */}
        {dna.topGenres.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
              Géneros dominantes
            </h3>
            <div className="space-y-2.5">
              {dna.topGenres.map(({ genre, weight }) => (
                <GenreBar
                  key={genre}
                  genre={genre}
                  weight={weight}
                  max={maxGenreWeight}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 4. Top artistas ── */}
        {artists.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
              Tus artistas
            </h3>
            <div className="flex justify-around">
              {artists.slice(0, 3).map((a) => (
                <ArtistAvatar key={a.name} {...a} />
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Narrativa ── */}
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3">
          <p className="text-xs text-white/55 leading-relaxed">{narrative}</p>
        </div>

        {/* ── 6. Branding (visible en capturas compartidas) ── */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-white/20 tracking-wider uppercase">
            dnamusical.app
          </p>
          <div className="flex gap-1.5">
            {RADAR_LABELS.map(({ key }) => (
              <div
                key={key}
                className="h-1 rounded-full bg-[#7F77DD]/40"
                style={{ width: `${Math.max(6, (dna[key] / 100) * 24)}px` }}
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
