"use client";

import { useId, useState } from "react";
import { Eye, ImageIcon, X } from "lucide-react";

type Props = {
  /** URL publik foto (sudah dikompres saat upload: WebP <= 1280px). `null` = belum ada foto. */
  photoUrl: string | null;
  name: string;
};

/**
 * Isi card "Foto Makam" di Detail Admin: preview 4:3 + "Lihat Foto" (dialog native, tanpa library).
 * Tanpa foto atau foto gagal dimuat -> placeholder ringan.
 */
export function GravePhotoPreview({ photoUrl, name }: Props) {
  const titleId = useId();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  if (!photoUrl || failed) {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-sage/50 px-4 text-center sm:h-52">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/80 text-primary" aria-hidden="true">
          <ImageIcon className="size-6" />
        </span>
        <p className="text-[0.95rem] font-medium text-muted">{failed ? "Foto makam gagal dimuat" : "Belum ada foto makam"}</p>
      </div>
    );
  }

  const alt = `Foto makam ${name}`;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto sudah dikompres saat upload */}
        <img
          src={photoUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={1280}
          height={960}
          onError={() => setFailed(true)}
          className="aspect-[16/10] w-full object-cover sm:aspect-[4/3]"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Eye className="size-4" aria-hidden="true" />
          Lihat Foto
        </button>
      </div>

      {open && (
        <dialog
          ref={(el) => {
            if (el && !el.open) el.showModal();
          }}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-(--shadow-lift) backdrop:bg-ink/70 backdrop:backdrop-blur-[2px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line py-2 pl-5 pr-2">
            <h2 id={titleId} className="min-w-0 truncate font-semibold">
              {alt}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Tutup</span>
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- memakai file yang sama (sudah di-cache browser) */}
          <img src={photoUrl} alt={alt} decoding="async" className="max-h-[80dvh] w-full bg-ink/5 object-contain" />
        </dialog>
      )}
    </>
  );
}
