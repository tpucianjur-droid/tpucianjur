import { PHOTO } from "@/lib/config";

/** Validasi server-side untuk file hasil kompres: tipe, ukuran, dan signature byte (bukan sekadar MIME dari klien). */
export async function validateCompressedPhoto(
  file: Blob,
): Promise<{ ok: true; type: "image/webp" | "image/jpeg"; extension: "webp" | "jpg" } | { ok: false; message: string }> {
  if (file.size === 0) return { ok: false, message: "File foto kosong." };
  if (file.size > PHOTO.hardMaxBytes) return { ok: false, message: "Ukuran foto melebihi 1 MB setelah dikompres." };

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (isWebp(header)) return { ok: true, type: "image/webp", extension: "webp" };
  if (isJpeg(header)) return { ok: true, type: "image/jpeg", extension: "jpg" };
  return { ok: false, message: "Format foto tidak didukung. Gunakan WebP atau JPEG." };
}

function isWebp(h: Uint8Array) {
  return (
    h.length >= 12 &&
    h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && // RIFF
    h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50 // WEBP
  );
}

function isJpeg(h: Uint8Array) {
  return h.length >= 3 && h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff;
}

/** Path objek unik per unggahan agar cache CDN tidak menampilkan foto lama. */
export function buildPhotoPath(graveId: string, extension: "webp" | "jpg", now: number = Date.now()): string {
  return `${graveId}/cover-${now}.${extension}`;
}
