/**
 * Environment Supabase hosted. Hanya URL + publishable key (atau legacy anon key) yang dipakai aplikasi.
 * Service-role key TIDAK pernah dipakai oleh aplikasi.
 */
export type SupabaseEnv = { url: string; anonKey: string };

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !anonKey || url.includes("YOUR-PROJECT-REF")) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local (lihat .env.example).",
    );
  }
  return env;
}

/** URL publik foto makam (bucket public, hanya berisi foto hasil kompres). */
export function photoPublicUrl(photoPath: string | null | undefined): string | null {
  const env = getSupabaseEnv();
  if (!env || !photoPath) return null;
  const encoded = photoPath.split("/").map(encodeURIComponent).join("/");
  return `${env.url}/storage/v1/object/public/grave-photos/${encoded}`;
}
