import Image from "next/image";
import { TPU_ASSETS } from "@/lib/assets";
import { MESSAGES } from "@/lib/config";
import { photoPublicUrl } from "@/lib/env";

/**
 * Foto opsional (maks. 1). Foto pengguna sudah dikompres saat upload (WebP <= 1280px),
 * jadi dipakai <img> biasa dengan lazy loading. Tanpa foto -> placeholder dari aset.
 */
export function GravePhoto({ photoPath, name, eager = false }: { photoPath: string | null; name: string; eager?: boolean }) {
  const url = photoPublicUrl(photoPath);
  if (!url) {
    return (
      <figure className="relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-line bg-linear-to-b from-sage/60 to-surface">
        <Image
          src={TPU_ASSETS.placeholderMakam}
          alt=""
          width={512}
          height={512}
          sizes="(min-width: 768px) 240px, 60vw"
          className="h-3/4 w-auto object-contain"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-white/85 px-3 py-2 text-center text-sm font-medium text-muted">
          {MESSAGES.noPhoto}
        </figcaption>
      </figure>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sudah dioptimasi saat upload
    <img
      src={url}
      alt={`Foto makam ${name}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      width={1280}
      height={960}
      className="aspect-[4/3] w-full rounded-2xl bg-surface object-cover"
    />
  );
}
