import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

/**
 * Hanya berjalan di /admin: memperbarui cookie sesi Supabase dan mengalihkan pengguna
 * tanpa sesi ke /admin/login. Otorisasi final tetap dicek di server (requireAdmin + RLS).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  let response = NextResponse.next({ request });

  const env = getSupabaseEnv();
  let isSignedIn = false;

  if (env) {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    });
    try {
      const { data } = await supabase.auth.getUser();
      isSignedIn = Boolean(data.user);
    } catch {
      isSignedIn = false;
    }
  }

  if (!isSignedIn && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Pengguna yang sudah login di halaman login ditangani oleh halaman itu sendiri
  // (Admin => dashboard, akun non-Admin => pesan + tombol keluar) agar tidak terjadi loop redirect.

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
