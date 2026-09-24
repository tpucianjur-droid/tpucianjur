import { PHOTO } from "@/lib/config";

/**
 * Kompres foto di BROWSER sebelum diunggah: resize sisi terpanjang <= 1280px,
 * encode WebP (fallback JPEG), turunkan kualitas bertahap sampai <= ~250 KB.
 * File asli kamera tidak pernah dikirim ke server.
 */
export type CompressedPhoto = {
  blob: Blob;
  type: "image/webp" | "image/jpeg";
  width: number;
  height: number;
  originalBytes: number;
};

export class PhotoProcessingError extends Error {}

const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42] as const;

export function fitWithin(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type Encoder = (type: "image/webp" | "image/jpeg", quality: number) => Promise<Blob | null>;

/**
 * Pilih hasil encode terkecil yang memenuhi target. Mengembalikan null bila tidak ada hasil <= hardMaxBytes
 * (pemanggil lalu memperkecil dimensi).
 */
export async function encodeWithinBudget(
  encode: Encoder,
  targetMaxBytes: number,
  hardMaxBytes: number,
): Promise<{ blob: Blob; type: "image/webp" | "image/jpeg" } | null> {
  let type: "image/webp" | "image/jpeg" = "image/webp";
  let smallest: Blob | null = null;

  for (const quality of QUALITY_STEPS) {
    let blob = await encode(type, quality);
    // Browser yang tidak mendukung WebP mengembalikan PNG/null -> pakai JPEG.
    if (type === "image/webp" && (!blob || blob.type !== "image/webp")) {
      type = "image/jpeg";
      blob = await encode(type, quality);
    }
    if (!blob) continue;
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= targetMaxBytes) return { blob, type };
  }

  if (smallest && smallest.size <= hardMaxBytes) return { blob: smallest, type };
  return null;
}

export function validateInputFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "File harus berupa gambar (JPG, PNG, WebP, atau HEIC).";
  if (file.size > PHOTO.maxInputBytes) return "Ukuran foto terlalu besar (maksimal 25 MB sebelum dikompres).";
  return null;
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const invalid = validateInputFile(file);
  if (invalid) throw new PhotoProcessingError(invalid);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoProcessingError("Foto tidak dapat dibaca. Coba pilih foto lain (format JPG/PNG/WebP).");
  }

  try {
    let maxDimension: number = PHOTO.maxDimension;
    for (let attempt = 0; attempt < 3; attempt++) {
      const size = fitWithin(bitmap.width, bitmap.height, maxDimension);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new PhotoProcessingError("Browser tidak mendukung pemrosesan foto.");
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, size.width, size.height);

      const encode: Encoder = (type, quality) =>
        new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));

      const result = await encodeWithinBudget(encode, PHOTO.targetMaxBytes, PHOTO.hardMaxBytes);
      if (result) {
        return { ...result, width: size.width, height: size.height, originalBytes: file.size };
      }
      maxDimension = Math.round(maxDimension * 0.75);
    }
    throw new PhotoProcessingError("Foto tidak dapat dikompres cukup kecil. Coba foto lain.");
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
