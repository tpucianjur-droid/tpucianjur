"use server";

import { revalidatePath } from "next/cache";
import { MESSAGES, PHOTO } from "@/lib/config";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { formatGraveCode } from "@/lib/graves/code";
import { ALL_VERIFIED, VERIFY_FIELD_KEYS } from "@/lib/graves/verification";
import { logError } from "@/lib/log";
import { buildPhotoPath, validateCompressedPhoto } from "@/lib/photo/validate";
import { getServerSupabase } from "@/lib/supabase/server";
import type { GraveRow } from "@/lib/supabase/database.types";
import { formDataToObject, graveFormSchema, positionSchema, toFieldErrors } from "@/lib/validation";
import { isPermissionError, isUniqueViolation, type ActionResult } from "./result";

export type SavedGrave = { id: string; grave_code: string };

/**
 * Simpan data utama makam (tambah/edit). Foto TIDAK ikut di sini: diunggah terpisah
 * setelah data utama berhasil, sehingga kegagalan foto tidak menggagalkan penyimpanan.
 */
export async function saveGrave(_prev: ActionResult<SavedGrave>, formData: FormData): Promise<ActionResult<SavedGrave>> {
  try {
    await requireAdmin();
  } catch (error) {
    return unauthorized(error);
  }

  const raw = formDataToObject(formData);
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  const verifyAll = raw.intent === "save-verify";

  const parsed = graveFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Beberapa data belum benar. Periksa kolom yang ditandai.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const values = parsed.data;
  const flags = verifyAll ? ALL_VERIFIED : Object.fromEntries(VERIFY_FIELD_KEYS.map((k) => [k, values[k]]));

  const supabase = await getServerSupabase();
  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .select("id, code, cemetery_id")
    .eq("id", values.block_id)
    .maybeSingle();
  if (blockError || !block) {
    return { status: "error", message: "Blok tidak ditemukan.", fieldErrors: { block_id: "Pilih blok yang tersedia." } };
  }

  const payload: Partial<GraveRow> = {
    deceased_name: values.deceased_name,
    death_date: values.death_date,
    date_semantics: values.date_semantics,
    heir_name: values.heir_name,
    heir_phone: values.heir_phone,
    heir_address: values.heir_address,
    block_id: block.id,
    cemetery_id: block.cemetery_id,
    grave_number: values.grave_number,
    grave_code: formatGraveCode(block.code, values.grave_number),
    visual_row: values.visual_row,
    visual_column: values.visual_column,
    visual_x: values.visual_x,
    visual_y: values.visual_y,
    is_public: values.is_public,
    transcription_notes: values.transcription_notes,
    ...flags,
  };

  const result = id
    ? await supabase.from("graves").update(payload).eq("id", id).select("id, grave_code").maybeSingle()
    : await supabase
        .from("graves")
        .insert({ ...payload, cemetery_id: block.cemetery_id, grave_code: payload.grave_code!, deceased_name: values.deceased_name })
        .select("id, grave_code")
        .single();

  if (result.error) {
    if (isUniqueViolation(result.error)) {
      return {
        status: "error",
        message: `Nomor makam ${values.grave_number} sudah dipakai di Blok ${block.code}.`,
        fieldErrors: { grave_number: "Nomor ini sudah dipakai di blok yang sama. Gunakan nomor lain." },
      };
    }
    if (isPermissionError(result.error)) return unauthorized(result.error);
    logError("saveGrave", result.error);
    return { status: "error", message: "Data belum berhasil disimpan. Coba lagi." };
  }
  if (!result.data) return { status: "error", message: "Data makam tidak ditemukan atau sudah dihapus." };

  revalidateGravePaths(result.data.grave_code);
  return {
    status: "success",
    message: verifyAll ? "Data makam berhasil diverifikasi." : "Data makam berhasil disimpan.",
    data: result.data,
  };
}

export async function setArchived(graveId: string, archived: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return unauthorized(error);
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("graves")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", graveId)
    .select("grave_code")
    .maybeSingle();
  if (error || !data) {
    logError("setArchived", error);
    return { status: "error", message: "Status arsip belum berhasil diubah. Coba lagi." };
  }
  revalidateGravePaths(data.grave_code);
  return {
    status: "success",
    message: archived ? "Data dipindahkan ke arsip dan tidak tampil di halaman publik." : "Data dikembalikan dari arsip.",
  };
}

/**
 * Hapus permanen satu data makam (hanya setelah konfirmasi di UI). Keamanan tetap dari RLS
 * `graves_admin_delete`; riwayat tetap tercatat di audit_logs (trigger DELETE). Foto ikut dibersihkan.
 */
export async function deleteGrave(graveId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return unauthorized(error);
  }
  if (typeof graveId !== "string" || !/^[0-9a-f-]{36}$/i.test(graveId)) {
    return { status: "error", message: "Data makam tidak valid." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from("graves").delete().eq("id", graveId).select("grave_code, photo_path");
  if (error) {
    if (isPermissionError(error)) return unauthorized(error);
    logError("deleteGrave", error);
    return { status: "error", message: "Data makam belum berhasil dihapus. Coba lagi." };
  }
  // RLS yang menolak DELETE tidak mengembalikan error, hanya 0 baris.
  const deleted = data?.[0];
  if (!deleted) return { status: "error", message: "Data makam tidak ditemukan atau Anda tidak memiliki izin menghapus." };

  if (deleted.photo_path) {
    const removed = await supabase.storage.from(PHOTO.bucket).remove([deleted.photo_path]);
    if (removed.error) logError("deleteGrave.photo", removed.error);
  }

  revalidateGravePaths(deleted.grave_code);
  revalidatePath("/denah");
  return { status: "success", message: "Data makam berhasil dihapus." };
}

/** Unggah foto hasil kompres (maks. 1 per makam). Foto lama dihapus setelah foto baru berhasil. */
export async function uploadGravePhoto(graveId: string, formData: FormData): Promise<ActionResult<{ photo_path: string }>> {
  try {
    await requireAdmin();
  } catch (error) {
    return unauthorized(error);
  }

  const file = formData.get("photo");
  if (!(file instanceof Blob)) return { status: "error", message: "Foto tidak ditemukan." };

  const check = await validateCompressedPhoto(file);
  if (!check.ok) return { status: "error", message: check.message };

  const supabase = await getServerSupabase();
  const { data: grave } = await supabase.from("graves").select("id, grave_code, photo_path").eq("id", graveId).maybeSingle();
  if (!grave) return { status: "error", message: "Data makam tidak ditemukan." };

  const path = buildPhotoPath(grave.id, check.extension);
  const upload = await supabase.storage.from(PHOTO.bucket).upload(path, file, {
    contentType: check.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) {
    logError("uploadGravePhoto.upload", upload.error);
    return { status: "error", message: MESSAGES.photoUploadFailed };
  }

  const { error: updateError } = await supabase.from("graves").update({ photo_path: path }).eq("id", grave.id);
  if (updateError) {
    logError("uploadGravePhoto.update", updateError);
    await supabase.storage.from(PHOTO.bucket).remove([path]);
    return { status: "error", message: MESSAGES.photoUploadFailed };
  }

  if (grave.photo_path && grave.photo_path !== path) {
    const removed = await supabase.storage.from(PHOTO.bucket).remove([grave.photo_path]);
    if (removed.error) logError("uploadGravePhoto.removeOld", removed.error);
  }

  revalidateGravePaths(grave.grave_code);
  return { status: "success", message: "Foto makam berhasil diunggah.", data: { photo_path: path } };
}

export async function removeGravePhoto(graveId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return unauthorized(error);
  }
  const supabase = await getServerSupabase();
  const { data: grave } = await supabase.from("graves").select("id, grave_code, photo_path").eq("id", graveId).maybeSingle();
  if (!grave) return { status: "error", message: "Data makam tidak ditemukan." };
  if (!grave.photo_path) return { status: "success", message: "Makam ini belum memiliki foto." };

  const { error } = await supabase.from("graves").update({ photo_path: null }).eq("id", grave.id);
  if (error) {
    logError("removeGravePhoto", error);
    return { status: "error", message: "Foto belum berhasil dihapus. Coba lagi." };
  }
  const removed = await supabase.storage.from(PHOTO.bucket).remove([grave.photo_path]);
  if (removed.error) logError("removeGravePhoto.storage", removed.error);

  revalidateGravePaths(grave.grave_code);
  return { status: "success", message: "Foto makam dihapus." };
}

/** Ubah posisi visual satu makam dari editor denah. */
export async function setGravePosition(input: {
  grave_id: string;
  visual_row: number | null;
  visual_column: number | null;
  visual_x?: number | null;
  visual_y?: number | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (error) {
    return unauthorized(error);
  }
  const parsed = positionSchema.safeParse({ visual_x: null, visual_y: null, ...input });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Posisi tidak valid." };

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("graves")
    .update({
      visual_row: parsed.data.visual_row,
      visual_column: parsed.data.visual_column,
      visual_x: parsed.data.visual_x,
      visual_y: parsed.data.visual_y,
    })
    .eq("id", parsed.data.grave_id)
    .select("grave_code")
    .maybeSingle();
  if (error || !data) {
    logError("setGravePosition", error);
    return { status: "error", message: "Posisi belum berhasil disimpan. Coba lagi." };
  }
  revalidateGravePaths(data.grave_code);
  return { status: "success", message: `Posisi ${data.grave_code} disimpan.` };
}

function revalidateGravePaths(code: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/makam/${code}`);
  revalidatePath(`/makam/${code}/lokasi`);
}

function unauthorized(error: unknown): { status: "error"; message: string } {
  if (!(error instanceof UnauthorizedError)) logError("graves.unauthorized", error);
  return { status: "error", message: new UnauthorizedError().message };
}
