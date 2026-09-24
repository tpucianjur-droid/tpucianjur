"use server";

import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import { getServerSupabase } from "@/lib/supabase/server";
import { cleanText } from "@/lib/validation";
import type { ActionResult } from "./result";

/** Hanya izinkan redirect internal ke area Admin (mencegah open redirect). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return /^\/admin(\/[A-Za-z0-9\-/[\]]*)?$/.test(next) && next !== "/admin/login" ? next : "/admin";
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = cleanText(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

  const fieldErrors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Masukkan alamat email yang valid.";
  if (password.length === 0) fieldErrors.password = "Password wajib diisi.";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Email dan password wajib diisi dengan benar.", fieldErrors };
  }

  if (!getSupabaseEnv()) {
    return { status: "error", message: "Aplikasi belum terhubung ke database. Hubungi administrator sistem." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 400 || error.code === "invalid_credentials") {
      return { status: "error", message: "Email atau password salah. Silakan coba lagi." };
    }
    if (error.status === 429) {
      return { status: "error", message: "Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi." };
    }
    logError("signIn", error);
    return { status: "error", message: "Tidak dapat masuk saat ini. Periksa koneksi internet lalu coba lagi." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await getServerSupabase();
    await supabase.auth.signOut();
  } catch (error) {
    logError("signOut", error);
  }
  redirect("/admin/login");
}
