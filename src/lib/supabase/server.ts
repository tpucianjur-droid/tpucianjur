import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Klien dengan sesi Admin dari cookie. Semua query tetap dibatasi RLS (`is_admin()`). */
export async function getServerSupabase() {
  // cookies() dibaca lebih dulu agar rute Admin selalu dinamis (tidak di-prerender saat build).
  const cookieStore = await cookies();
  const env = requireSupabaseEnv();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Dipanggil dari Server Component: cookie diperbarui oleh proxy.ts.
        }
      },
    },
  });
}
