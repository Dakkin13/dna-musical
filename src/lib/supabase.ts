import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { DnaProfile } from "@/types";

// Inicialización lazy: el cliente se crea la primera vez que se usa,
// no al importar el módulo. Esto evita que el build de Vercel crashee
// si las variables de entorno se añaden después del primer deploy.
let _client: ReturnType<typeof createSupabaseClient> | null = null;

function getClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _client = createSupabaseClient(url, key);
  return _client;
}

/**
 * Proxy que expone la misma API que el cliente directo pero con
 * inicialización lazy para compatibilidad con el build de Vercel.
 */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_target, prop) {
    return getClient()[prop as keyof ReturnType<typeof createSupabaseClient>];
  },
});

// --- Helpers de base de datos ---

/** Obtiene un perfil de DNA por su slug público */
export async function getDnaProfileBySlug(
  slug: string
): Promise<DnaProfile | null> {
  const { data, error } = await supabase
    .from("dna_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (error || !data) return null;
  return data as DnaProfile;
}

/** Obtiene el perfil de DNA más reciente de un usuario */
export async function getDnaProfileByUserId(
  userId: string
): Promise<DnaProfile | null> {
  const { data, error } = await supabase
    .from("dna_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as DnaProfile;
}

/** Guarda o actualiza el perfil de DNA de un usuario */
export async function upsertDnaProfile(
  profile: Omit<DnaProfile, "id" | "createdAt" | "updatedAt">
): Promise<DnaProfile | null> {
  const { data: _upsertData, error } = await supabase
    .from("dna_profiles")
    .upsert(
      {
        user_id: profile.userId,
        slug: profile.slug,
        dna: profile.dna,
        is_public: profile.isPublic,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
      } as unknown as never,
      { onConflict: "user_id" }
    )
    .select()
    .single();
  const data = _upsertData as DnaProfile | null;

  if (error || !data) return null;
  return data as DnaProfile;
}
