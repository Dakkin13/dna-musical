import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { DnaProfile } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Cliente de Supabase para uso en el browser (componentes Client) y en
 * Route Handlers. Usa la anon key — las políticas RLS de la tabla controlan
 * el acceso según el JWT del usuario.
 */
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

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
  const { data, error } = await supabase
    .from("dna_profiles")
    .upsert(
      {
        user_id: profile.userId,
        slug: profile.slug,
        dna: profile.dna,
        is_public: profile.isPublic,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error || !data) return null;
  return data as DnaProfile;
}
