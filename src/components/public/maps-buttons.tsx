import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { buttonClass, ExternalLinkButton } from "@/components/ui/button";
import { Card, IconBadge } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { MESSAGES } from "@/lib/config";
import { buildDirectionsUrl, buildMapsUrl } from "@/lib/maps";
import type { PublicSettings } from "@/lib/data/public";

/** Tombol "Petunjuk ke TPU" — nonaktif dengan pesan bila lokasi belum dikonfigurasi (SRS §5). */
export function DirectionsButton({
  settings,
  size = "lg",
  className,
  label = "Petunjuk ke TPU",
}: {
  settings: PublicSettings | null;
  size?: "md" | "lg";
  className?: string;
  label?: string;
}) {
  const url = buildDirectionsUrl(settings);
  if (!url) {
    return (
      <span className="block">
        <button type="button" disabled className={buttonClass("primary", size, className)}>
          <Navigation className="size-5" aria-hidden="true" />
          {label}
        </button>
        <span className="mt-1 block text-sm text-muted">{MESSAGES.mapsNotConfigured}</span>
      </span>
    );
  }
  return (
    <ExternalLinkButton href={url} variant="primary" size={size} className={className} icon={<Navigation className="size-5" aria-hidden="true" />}>
      {label}
      <span className="sr-only"> (membuka Google Maps)</span>
    </ExternalLinkButton>
  );
}

export function LocationCard({
  settings,
  className,
  compact = false,
}: {
  settings: PublicSettings | null;
  className?: string;
  /** Untuk kolom sempit: tata letak bertumpuk & tanpa tombol (tombol Maps utama ditampilkan terpisah). */
  compact?: boolean;
}) {
  const mapsUrl = buildMapsUrl(settings);
  return (
    <Card className={className}>
      <div className={cn("flex flex-col gap-5 p-5 sm:p-6", !compact && "md:flex-row md:items-center md:justify-between")}>
        <div className="flex gap-4">
          <IconBadge>
            <MapPin className="size-5" />
          </IconBadge>
          <div>
            <p className="font-semibold">{settings?.name ?? "TPU Astana Pratiksha Cianjur"}</p>
            <p className="mt-1 max-w-md text-muted">{settings?.address ?? "Alamat belum tersedia."}</p>
          </div>
        </div>
        {compact ? null : mapsUrl ? (
          <ExternalLinkButton
            href={mapsUrl}
            variant="secondary"
            className="shrink-0"
            icon={<ExternalLink className="size-4" aria-hidden="true" />}
          >
            Buka Google Maps
          </ExternalLinkButton>
        ) : (
          <p className="text-sm text-muted">{MESSAGES.mapsNotConfigured}</p>
        )}
      </div>
    </Card>
  );
}
