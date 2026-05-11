import Link from "next/link";

export default function ShareNotFound() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 px-6 text-center">
      {/* Ilustración */}
      <div className="relative">
        <div className="text-7xl select-none" aria-hidden>
          🎵
        </div>
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-20"
          style={{ background: "radial-gradient(circle, #7F77DD, transparent)" }}
          aria-hidden
        />
      </div>

      {/* Texto */}
      <div className="space-y-3 max-w-sm">
        <p className="text-[10px] uppercase tracking-widest text-[#7F77DD]/60">
          Error 404
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Este ADN no existe
        </h1>
        <p className="text-white/50 text-sm leading-relaxed">
          El perfil que buscas no existe, fue eliminado, o su dueño lo marcó
          como privado.
        </p>
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#7F77DD] px-6 text-sm font-semibold text-white transition-all hover:bg-[#6e66cc] active:scale-[0.97]"
        >
          Ir al inicio
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-medium text-white/80 transition-all hover:bg-white/10 active:scale-[0.97]"
        >
          Descubrir mi DNA →
        </Link>
      </div>
    </div>
  );
}
