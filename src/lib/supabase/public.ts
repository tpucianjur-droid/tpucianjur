import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Klien anonim tanpa sesi untuk data publik. Hanya dapat membaca view `public_graves`,
 * RPC pencarian, blok aktif, dan pengaturan TPU (dijaga oleh RLS & privilege database).
 */
export function getPublicSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const env = requireSupabaseEnv();
  client = createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
