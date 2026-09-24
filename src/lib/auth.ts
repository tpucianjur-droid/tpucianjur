import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

export type AdminSession = {
  userId: string;
  email: string | null;
  displayName: string;
};

export type AdminCheck =
  | { status: "ok"; admin: AdminSession }
  | { status: "signed-out" }
  | { status: "forbidden"; email: string | null };

/** Satu kali per request: validasi user ke Supabase Auth + cek keanggotaan admin_users. */
export const checkAdmin = cache(async (): Promise<AdminCheck> => {
  if (!getSupabaseEnv()) {
    await cookies(); // tetap dinamis
    return { status: "signed-out" };
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "signed-out" };

  const { data: row } = await supabase
    .from("admin_users")
    .select("display_name, email")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!row) return { status: "forbidden", email: data.user.email ?? null };

  return {
    status: "ok",
    admin: {
      userId: data.user.id,
      email: data.user.email ?? row.email,
      displayName: row.display_name || data.user.email?.split("@")[0] || "Admin",
    },
  };
});

/** Untuk halaman Admin: alihkan ke login bila belum masuk. */
export async function requireAdminPage(): Promise<AdminSession> {
  const result = await checkAdmin();
  if (result.status === "ok") return result.admin;
  if (result.status === "forbidden") redirect("/admin/login?error=forbidden");
  redirect("/admin/login");
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Sesi berakhir atau akun tidak memiliki akses Admin. Silakan masuk kembali.");
  }
}

/** Untuk Server Action / Route Handler: lempar error bila bukan Admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const result = await checkAdmin();
  if (result.status !== "ok") throw new UnauthorizedError();
  return result.admin;
}
