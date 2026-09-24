import type { ActionResult } from "@/lib/actions/result";
import type { SavedGrave } from "@/lib/actions/graves";
import { MESSAGES } from "@/lib/config";

export type PhotoOutcome = "none" | "uploaded" | "removed" | "failed";

export type SaveFlowResult = {
  result: ActionResult<SavedGrave>;
  photo: PhotoOutcome;
  photoMessage?: string;
};

type Deps = {
  save: () => Promise<ActionResult<SavedGrave>>;
  /** Diisi bila Admin memilih foto baru (sudah dikompres). */
  uploadPhoto?: (graveId: string) => Promise<ActionResult<unknown>>;
  /** Diisi bila Admin menghapus foto lama tanpa mengganti. */
  removePhoto?: (graveId: string) => Promise<ActionResult>;
};

/**
 * Urutan wajib: simpan data utama DULU, baru foto.
 * Kegagalan foto (termasuk error jaringan/storage penuh) tidak pernah membatalkan data utama.
 */
export async function runSaveFlow({ save, uploadPhoto, removePhoto }: Deps): Promise<SaveFlowResult> {
  let result: ActionResult<SavedGrave>;
  try {
    result = await save();
  } catch {
    return { result: { status: "error", message: "Data belum berhasil disimpan. Periksa koneksi lalu coba lagi." }, photo: "none" };
  }
  if (result.status !== "success" || !result.data) return { result, photo: "none" };

  const graveId = result.data.id;
  if (uploadPhoto) {
    try {
      const upload = await uploadPhoto(graveId);
      if (upload.status === "success") return { result, photo: "uploaded" };
      return { result, photo: "failed", photoMessage: MESSAGES.photoUploadFailed };
    } catch {
      return { result, photo: "failed", photoMessage: MESSAGES.photoUploadFailed };
    }
  }

  if (removePhoto) {
    try {
      const removal = await removePhoto(graveId);
      if (removal.status === "success") return { result, photo: "removed" };
      return { result, photo: "failed", photoMessage: "Data tersimpan, tetapi foto lama belum berhasil dihapus." };
    } catch {
      return { result, photo: "failed", photoMessage: "Data tersimpan, tetapi foto lama belum berhasil dihapus." };
    }
  }

  return { result, photo: "none" };
}
