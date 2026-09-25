"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Eye, X } from "lucide-react";
import { TPU_ASSETS } from "@/lib/assets";

type Props = {
  /** URL publik foto (sudah dikompres saat upload: WebP <= 1280px). `null` = belum ada foto. */
  photoUrl: string | null;
  name: string;
};

/**
 * Isi card "Foto Makam" di Detail Admin: preview + "Lihat Foto" (dialog native, tanpa library).
 * Rasio: HP melebar (16:10 → 2:1), tablet potret 3:4, desktop lebar 4:5 agar tidak terlalu tinggi.
 * Tanpa foto atau foto gagal dimuat -> gambar default makam (aset placeholder) dengan ukuran sama,
 * agar card tetap berisi dan layout tidak bergeser. Gambar default bukan foto asli, jadi tanpa "Lihat Foto".
 */
const FRAME = "aspect-[16/10] w-full sm:aspect-[2/1] md:aspect-[3/4] xl:aspect-[4/5]";

export function GravePhotoPreview({ photoUrl, name }: Props) {
  const titleId = useId();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  if (!photoUrl || failed) {
    return (
      <figure
        className={`${FRAME} relative flex items-center justify-center overflow-hidden rounded-xl border border-line bg-linear-to-b from-sage/70 to-surface pb-9`}
      >
        {/* Ilustrasi transparan: object-contain supaya nisan tidak terpotong di bingkai mana pun. */}
        <Image
          src={TPU_ASSETS.placeholderMakam}
          alt=""
          width={512}
          height={512}
          sizes="(min-width: 768px) 360px, 60vw"
          className="h-[85%] w-auto max-w-[85%] object-contain"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-white/85 px-3 py-2 text-center text-sm font-medium text-muted">
          {failed ? "Foto makam gagal dimuat" : "Belum ada foto makam"}
        </figcaption>
      </figure>
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
          className={`${FRAME} block object-cover`}
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
