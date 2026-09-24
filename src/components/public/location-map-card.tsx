import { MapPin, Navigation, SquareArrowOutUpRight } from "lucide-react";
import { ExternalLinkButton } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { MESSAGES, TPU_ADDRESS } from "@/lib/config";
import type { PublicSettings } from "@/lib/data/public";
import { buildDirectionsUrl, buildMapsUrl } from "@/lib/maps";

/** Posisi pin pada ilustrasi (viewBox 640x360) — dipakai juga oleh label HTML di atas SVG. */
const PIN = { x: 360, y: 138 };

/**
 * Section Lokasi TPU: judul + teks singkat, pratinjau peta (seluruh area dapat diklik → Google Maps),
 * alamat lengkap, dan SATU tombol utama "Petunjuk Arah".
 * HP: judul → peta → alamat & tombol. Desktop: teks di kiri, peta proporsional di kanan.
 */
export function LocationSection({
  settings,
  eyebrow = "Lokasi TPU",
  title = "Temukan Lokasi Kami",
  description = "Gunakan Google Maps untuk menuju TPU. Setelah tiba, gunakan denah di aplikasi ini untuk menemukan posisi makam.",
  className,
}: {
  settings: PublicSettings | null;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  const location = settings ?? { name: null, address: TPU_ADDRESS, google_maps_query: TPU_ADDRESS, google_maps_url: null };
  const mapsUrl = buildMapsUrl(location);
  const directionsUrl = buildDirectionsUrl(location);
  const name = location.name ?? "TPU Astana Pratiksha Cianjur";
  const address = location.address || TPU_ADDRESS;

  return (
    <div className={cn("grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-x-14 lg:gap-y-6", className)}>
      <SectionHeading align="left" eyebrow={eyebrow} title={title} description={description} />

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <MapPreview href={mapsUrl} name={name} />
      </div>

      <div className="space-y-5">
        <div className="flex gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-primary" aria-hidden="true">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{name}</p>
            <address className="mt-1 max-w-md not-italic leading-relaxed text-muted">{address}</address>
          </div>
        </div>
        {directionsUrl ? (
          <ExternalLinkButton
            href={directionsUrl}
            size="lg"
            className="w-full sm:w-auto"
            icon={<Navigation className="size-5" aria-hidden="true" />}
          >
            Petunjuk Arah
            <span className="sr-only"> ke {name} (membuka Google Maps)</span>
          </ExternalLinkButton>
        ) : (
          <p className="text-sm text-muted">{MESSAGES.mapsNotConfigured}</p>
        )}
      </div>
    </div>
  );
}

/** Pratinjau peta statis (SVG inline, tanpa embed/API key). Seluruh kartu adalah tautan ke Google Maps. */
function MapPreview({ href, name }: { href: string | null; name: string }) {
  const body = (
    <>
      <MapIllustration />
      <span
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-(--shadow-card)"
        style={{ left: `${(PIN.x / 640) * 100}%`, top: `calc(${((PIN.y - 50) / 360) * 100}% - 4px)` }}
      >
        {name}
      </span>
    </>
  );

  if (!href) {
    return <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line/80 bg-white shadow-(--shadow-card)">{body}</div>;
  }
  return (
    <figure className="space-y-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-line/80 bg-white shadow-(--shadow-card) transition-shadow duration-200 hover:shadow-(--shadow-lift)"
      >
        {body}
        <span className="sr-only">Buka lokasi {name} di Google Maps (tab baru)</span>
      </a>
      <figcaption className="flex items-center justify-center gap-1.5 text-xs text-muted lg:justify-start">
        <SquareArrowOutUpRight className="size-3.5" aria-hidden="true" />
        Ketuk peta untuk membuka Google Maps
      </figcaption>
    </figure>
  );
}

/** Ilustrasi peta ringan: jalan, sungai, area hijau, dan kompleks makam dengan pin. Bukan peta geografis presisi. */
function MapIllustration() {
  return (
    <svg
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
      aria-hidden="true"
    >
      <rect width="640" height="360" fill="#edf2ec" />
      {/* Blok permukiman */}
      <g fill="#dfe7df">
        <rect x="20" y="20" width="150" height="110" rx="10" />
        <rect x="20" y="250" width="190" height="95" rx="10" />
        <rect x="470" y="20" width="150" height="80" rx="10" />
        <rect x="480" y="245" width="140" height="100" rx="10" />
        <rect x="300" y="255" width="140" height="90" rx="10" />
      </g>
      {/* Area hijau */}
      <path d="M470 120 C520 110 600 118 640 130 V225 C590 232 520 222 470 212 Z" fill="#d2e5d5" />
      <circle cx="80" cy="185" r="36" fill="#d2e5d5" />
      {/* Sungai */}
      <path d="M-10 318 C120 292 190 342 320 318 S520 280 650 300" fill="none" stroke="#c9dfea" strokeWidth="14" strokeLinecap="round" />
      {/* Jalan: casing lalu isi putih */}
      <g fill="none" strokeLinecap="round">
        <g stroke="#cdd6d0">
          <path d="M-20 214 C150 196 300 236 660 200" strokeWidth="24" />
          <path d="M238 -20 C250 120 222 250 262 380" strokeWidth="18" />
          <path d="M238 118 C320 100 400 96 470 110 S600 96 660 104" strokeWidth="12" />
        </g>
        <g stroke="#ffffff">
          <path d="M-20 214 C150 196 300 236 660 200" strokeWidth="18" />
          <path d="M238 -20 C250 120 222 250 262 380" strokeWidth="13" />
          <path d="M238 118 C320 100 400 96 470 110 S600 96 660 104" strokeWidth="8" />
        </g>
        <path d="M-20 214 C150 196 300 236 660 200" stroke="#e7d9b8" strokeWidth="1.5" strokeDasharray="10 10" />
      </g>
      {/* Kompleks TPU */}
      <rect x="286" y="126" width="160" height="72" rx="12" fill="#c6ddcc" stroke="#174a3a" strokeOpacity="0.45" strokeDasharray="6 5" strokeWidth="1.5" />
      <g fill="#9fb3a5">
        {Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 9 }, (_, col) => (
            <path
              key={`${row}-${col}`}
              d={`M${300 + col * 16} ${150 + row * 16} v-5 a4 4 0 0 1 8 0 v5 z`}
            />
          )),
        )}
      </g>
      {/* Pin lokasi */}
      <ellipse cx={PIN.x} cy={PIN.y + 2} rx="11" ry="4" fill="#15362d" opacity="0.2" />
      <circle cx={PIN.x} cy={PIN.y} r="16" fill="none" stroke="#174a3a" strokeWidth="3" className="pulse-ring" />
      <path
        transform={`translate(${PIN.x - 17} ${PIN.y - 46}) scale(1.4)`}
        d="M12 0C5.4 0 0 5.4 0 12c0 9 12 21 12 21s12-12 12-21C24 5.4 18.6 0 12 0z"
        fill="#174a3a"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <circle cx={PIN.x} cy={PIN.y - 29} r="6" fill="#ffffff" />
      <circle cx={PIN.x} cy={PIN.y - 29} r="3" fill="#9a7b45" />
    </svg>
  );
}
