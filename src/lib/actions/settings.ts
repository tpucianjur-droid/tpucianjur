"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { logError } from "@/lib/log";
import { getServerSupabase } from "@/lib/supabase/server";
import { blockFormSchema, formDataToObject, settingsFormSchema, toFieldErrors } from "@/lib/validation";
import { isUniqueViolation, type ActionResult } from "./result";

const SESSION_MESSAGE = "Sesi berakhir atau akun tidak memiliki akses Admin. Silakan masuk kembali.";

export async function saveSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { status: "error", message: SESSION_MESSAGE };
  }
  const raw = formDataToObject(formData);
  const parsed = settingsFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Periksa kembali isian pengaturan.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await getServerSupabase();
  const id = typeof raw.id === "string" ? raw.id : "";
  const { error } = id
    ? await supabase.from("cemeteries").update(parsed.data).eq("id", id)
    : await supabase.from("cemeteries").insert(parsed.data);

  if (error) {
    logError("saveSettings", error);
    return { status: "error", message: "Pengaturan belum berhasil disimpan. Coba lagi." };
  }
  updateTag(CACHE_TAGS.settings);
  revalidatePath("/", "layout");
  return { status: "success", message: "Pengaturan lokasi TPU berhasil disimpan." };
}

export async function saveBlock(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { status: "error", message: SESSION_MESSAGE };
  }
  const raw = formDataToObject(formData);
  const parsed = blockFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Periksa kembali isian blok.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await getServerSupabase();
  const id = typeof raw.id === "string" ? raw.id : "";
  let error;
  if (id) {
    ({ error } = await supabase.from("blocks").update(parsed.data).eq("id", id));
  } else {
    const { data: cemetery } = await supabase.from("cemeteries").select("id").order("created_at").limit(1).maybeSingle();
    if (!cemetery) return { status: "error", message: "Atur data TPU terlebih dahulu di menu Pengaturan." };
    ({ error } = await supabase.from("blocks").insert({ ...parsed.data, cemetery_id: cemetery.id }));
  }

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: `Kode blok ${parsed.data.code} sudah dipakai.`,
        fieldErrors: { code: "Kode blok sudah dipakai. Gunakan kode lain." },
      };
    }
    logError("saveBlock", error);
    return { status: "error", message: "Blok belum berhasil disimpan. Coba lagi." };
  }
  updateTag(CACHE_TAGS.blocks);
  revalidatePath("/", "layout");
  return { status: "success", message: `Blok ${parsed.data.code} berhasil disimpan.` };
}
