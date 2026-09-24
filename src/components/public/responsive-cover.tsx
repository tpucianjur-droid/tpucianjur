import { TPU_ASSETS } from "@/lib/assets";
import { cn } from "@/components/ui/cn";

/**
 * Gambar suasana (dekoratif) dengan art direction per breakpoint memakai <picture>.
 * Aset sudah WebP teroptimasi, jadi tidak melewati image optimizer (hemat kuota & cepat).
 */
export function HeroCover({ className }: { className?: string }) {
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={TPU_ASSETS.heroDesktop} type="image/webp" />
      <source media="(min-width: 640px)" srcSet={TPU_ASSETS.heroTablet} type="image/webp" />
      <img
        src={TPU_ASSETS.heroMobile}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}

export function PageHeaderCover({ className }: { className?: string }) {
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={TPU_ASSETS.pageHeaderDesktop} type="image/webp" />
      <img
        src={TPU_ASSETS.pageHeaderMobile}
        alt=""
        aria-hidden="true"
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}
