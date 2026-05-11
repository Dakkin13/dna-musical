import Link from "next/link";
import SpotifyConnectButton from "@/components/SpotifyConnectButton";

// Características que se muestran en la sección "Cómo funciona"
const features = [
  {
    icon: "🎵",
    title: "Conecta Spotify",
    description:
      "Autoriza el acceso a tu historial de escucha. Solo lectura, nunca modificamos tu cuenta.",
  },
  {
    icon: "🧬",
    title: "Analizamos tu ADN",
    description:
      "Calculamos tu energía, mood, bailabilidad, géneros dominantes y arquetipos musicales.",
  },
  {
    icon: "🎨",
    title: "Tu perfil visual",
    description:
      "Generamos una tarjeta única con tu ADN musical que puedes descargar y compartir.",
  },
];

// Arquetipos de ejemplo para animar la landing
const exampleArchetypes = [
  "El Explorador",
  "El Nostálgico",
  "El Fiestero",
  "El Melómano",
  "El Alternativo",
  "El Clásico",
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-purple-400">DNA</span> Musical
        </span>
        <Link
          href="/dashboard"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Mi perfil
        </Link>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden">
          {/* Fondo con gradiente radial */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.25) 0%, transparent 70%)",
            }}
          />

          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
            </span>
            Análisis en tiempo real
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-3xl leading-[1.1]">
            Tu música dice{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              quién eres
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/60 leading-relaxed">
            Conecta Spotify, analiza miles de escuchas y descubre tu{" "}
            <strong className="text-white/90">ADN musical</strong>: géneros,
            energía, mood y el arquetipo que te define.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-5">
            <SpotifyConnectButton size="lg" />
            <a
              href="#como-funciona"
              className="text-sm text-white/50 hover:text-white/80 transition-colors underline underline-offset-4"
            >
              ¿Cómo funciona?
            </a>
          </div>

          {/* Arquetipos flotantes (decorativo) */}
          <div className="mt-16 flex flex-wrap justify-center gap-2 max-w-lg opacity-50">
            {exampleArchetypes.map((a) => (
              <span
                key={a}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
              >
                {a}
              </span>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          className="px-6 py-24 max-w-5xl mx-auto"
        >
          <h2 className="text-center text-3xl font-bold mb-16">
            Tres pasos para conocerte
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-8 hover:border-purple-500/40 transition-colors"
              >
                {/* Número de paso */}
                <span className="absolute top-6 right-6 text-xs font-mono text-white/20">
                  0{i + 1}
                </span>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Segunda CTA */}
        <section className="text-center px-6 py-20 border-t border-white/10">
          <p className="text-white/50 text-sm mb-8">
            Gratis · Solo lectura · Sin almacenar contraseñas
          </p>
          <SpotifyConnectButton size="md" />
        </section>
      </main>

      <footer className="px-6 py-6 border-t border-white/10 text-center text-xs text-white/30">
        DNA Musical · Hecho con{" "}
        <span aria-label="amor">♥</span> y demasiadas playlists
      </footer>
    </div>
  );
}
