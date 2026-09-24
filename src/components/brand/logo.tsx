import Image from "next/image";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { TPU_ASSETS } from "@/lib/assets";
import { APP } from "@/lib/config";

/**
 * Logo mark dari aset brand. File 512x512 memuat sebagian teks di sisi kanan,
 * sehingga ditampilkan terpotong (crop CSS) agar hanya lambang gapura + daun yang terlihat.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative block size-10 shrink-0 overflow-hidden", className)} aria-hidden="true">
      <Image
        src={TPU_ASSETS.logoMark}
        alt=""
        width={512}
        height={512}
        sizes="96px"
        style={{ position: "absolute", width: "204.8%", height: "auto", maxWidth: "none", left: "-50.8%", top: "-53.2%" }}
      />
    </span>
  );
}

/** Logo horizontal (lambang + nama TPU). Area kosong atas/bawah dipotong dengan object-cover. */
export function Logo({ href = "/", className, priority = false }: { href?: string; className?: string; priority?: boolean }) {
  return (
    <Link href={href} className={cn("block rounded-lg", className)} aria-label={`${APP.shortName} ${APP.subtitle} — Beranda`}>
      <span className="relative block h-10 w-51 overflow-hidden sm:h-11 sm:w-56">
        <Image
          src={TPU_ASSETS.logo}
          alt={`${APP.shortName} ${APP.subtitle}`}
          fill
          priority={priority}
          sizes="(min-width: 640px) 224px, 204px"
          className="object-cover"
        />
      </span>
    </Link>
  );
}
