"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { LoadingOverlay } from "@/components/ui/skeletons";
import { TPU_ASSETS } from "@/lib/assets";
import { compressPhoto, formatBytes, PhotoProcessingError, type CompressedPhoto } from "@/lib/photo/compress";

export type PhotoChange =
  | { kind: "keep" }
  | { kind: "replace"; photo: CompressedPhoto; previewUrl: string }
  | { kind: "remove" };

/** Tahap proses foto saat formulir disimpan (diatur oleh GraveForm). */
export type PhotoPhase = "uploading" | "removing" | null;

type Props = {
  currentUrl: string | null;
  name: string;
  value: PhotoChange;
  onChange: (change: PhotoChange) => void;
  phase?: PhotoPhase;
  /** Formulir sedang disimpan: tombol foto dikunci. */
  disabled?: boolean;
};

/** Foto opsional: dikompres di browser (WebP ±1280px, target ≤250 KB) sebelum diunggah. */
export function PhotoPicker({ currentUrl, name, value, onChange, phase = null, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = value.kind === "replace" ? value.previewUrl : null;

  // Bebaskan memori blob pratinjau saat foto diganti/dibatalkan.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const photo = await compressPhoto(file);
      onChange({ kind: "replace", photo, previewUrl: URL.createObjectURL(photo.blob) });
    } catch (err) {
      setError(
        err instanceof PhotoProcessingError
          ? `${err.message} Data makam tetap dapat disimpan tanpa foto.`
          : "Foto tidak dapat diproses. Data makam tetap dapat disimpan tanpa foto.",
      );
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const shownUrl = value.kind === "replace" ? previewUrl : value.kind === "remove" ? null : currentUrl;

  return (
    <div className="grid gap-5 sm:grid-cols-[240px_1fr]">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        {processing && <LoadingOverlay label="Mengompres foto…" />}
        {phase === "uploading" && <LoadingOverlay label="Mengunggah foto…" />}
        {phase === "removing" && <LoadingOverlay label="Menghapus foto…" />}
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal / foto terkompres
          <img src={shownUrl} alt={`Foto makam ${name || "baru"}`} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-linear-to-b from-sage/60 to-surface">
            <Image src={TPU_ASSETS.placeholderMakam} alt="" width={512} height={512} sizes="160px" className="h-2/3 w-auto" />
            <p className="text-sm font-medium text-muted">Foto makam belum tersedia</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-[0.95rem] text-muted">
          Foto <strong>tidak wajib</strong>. Maksimal 1 foto. Foto otomatis diperkecil sebelum diunggah agar hemat kuota.
        </p>

        <input
          ref={inputRef}
          id="f-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled}
            loading={processing}
            loadingText="Mengompres foto…"
            onClick={() => inputRef.current?.click()}
            icon={<Camera className="size-5" aria-hidden="true" />}
          >
            {currentUrl || value.kind === "replace" ? "Ganti Foto" : "Pilih / Ambil Foto"}
          </Button>
          {value.kind === "replace" && (
            <Button variant="ghost" size="lg" disabled={disabled} onClick={() => onChange({ kind: "keep" })} icon={<RotateCcw className="size-5" aria-hidden="true" />}>
              Batalkan foto baru
            </Button>
          )}
          {currentUrl && value.kind === "keep" && (
            <Button variant="danger" size="lg" disabled={disabled} onClick={() => onChange({ kind: "remove" })} icon={<Trash2 className="size-5" aria-hidden="true" />}>
              Hapus Foto
            </Button>
          )}
          {value.kind === "remove" && (
            <Button variant="ghost" size="lg" disabled={disabled} onClick={() => onChange({ kind: "keep" })} icon={<RotateCcw className="size-5" aria-hidden="true" />}>
              Batal hapus
            </Button>
          )}
        </div>

        {value.kind === "replace" && (
          <p className="text-sm text-muted" role="status">
            Siap diunggah saat disimpan: {formatBytes(value.photo.originalBytes)} → <strong>{formatBytes(value.photo.blob.size)}</strong> (
            {value.photo.type === "image/webp" ? "WebP" : "JPEG"} {value.photo.width}×{value.photo.height}px)
          </p>
        )}
        {value.kind === "remove" && (
          <p className="text-sm font-medium text-danger" role="status">
            Foto akan dihapus saat Anda menekan Simpan.
          </p>
        )}
        {error && (
          <Alert tone="warning" live>
            {error}
          </Alert>
        )}
      </div>
    </div>
  );
}
