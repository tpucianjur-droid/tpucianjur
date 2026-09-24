import { BookOpen, Database, Map as MapIcon, MapPin, Search } from "lucide-react";
import { HeroCover } from "@/components/public/responsive-cover";
import { LocationSection } from "@/components/public/location-map-card";
import { QuickSearchForm } from "@/components/public/quick-search-form";
import { LinkButton } from "@/components/ui/button";
import { Card, IconBadge, SectionHeading } from "@/components/ui/card";
import { APP } from "@/lib/config";
import { getSettings } from "@/lib/data/public";

export const revalidate = 3600;

const FEATURES = [
  { icon: Search, title: "Pencarian Makam Cepat", text: "Temukan makam cukup dengan sebagian nama yang dimakamkan." },
  { icon: MapPin, title: "Petunjuk ke TPU", text: "Buka rute menuju TPU Astana Pratiksha melalui Google Maps." },
  { icon: MapIcon, title: "Denah Posisi Makam", text: "Lihat posisi makam pada denah blok secara digital dan interaktif." },
  { icon: Database, title: "Data Tersusun Rapi", text: "Data makam dikelola terstruktur dan diperbarui oleh petugas." },
] as const;

export default async function HomePage() {
  const settings = await getSettings();

  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0">
          <HeroCover className="object-[65%_center]" />
          <div className="absolute inset-0 bg-linear-to-b from-white via-white/80 to-white/5 md:bg-linear-to-r md:from-white md:via-white/75 md:to-transparent" />
        </div>
        <div className="relative mx-auto flex min-h-[560px] max-w-6xl flex-col justify-start px-4 pb-28 pt-10 sm:px-6 md:min-h-[520px] md:justify-center md:pb-32 md:pt-12">
          <div className="max-w-xl space-y-5">
            <p className="eyebrow">Sistem Aplikasi Pemakaman</p>
            <h1 className="font-serif text-4xl font-bold leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
              {APP.shortName}
              <span className="block text-gold">{APP.subtitle}</span>
            </h1>
            <p className="max-w-lg text-lg text-ink/80">{APP.tagline}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/cari-makam" size="lg" icon={<Search className="size-5" aria-hidden="true" />}>
                Cari Makam
              </LinkButton>
              <LinkButton href="/panduan" size="lg" variant="secondary" icon={<BookOpen className="size-5" aria-hidden="true" />}>
                Lihat Panduan
              </LinkButton>
            </div>
          </div>
          <div className="mt-auto hidden max-w-72 items-start gap-3 self-end rounded-2xl bg-white/95 p-3 shadow-(--shadow-lift) md:absolute md:bottom-32 md:right-6 md:flex">
            <IconBadge tone="primary" className="size-9">
              <MapPin className="size-4" />
            </IconBadge>
            <p className="text-sm">
              <span className="block font-semibold">{settings?.name ?? `${APP.shortName} ${APP.subtitle}`}</span>
              <span className="text-muted">Lokasi makam kini lebih mudah ditemukan.</span>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="pencarian-cepat" className="relative z-10 mx-auto -mt-20 max-w-5xl px-4 sm:px-6">
        <Card className="p-5 sm:p-7">
          <h2 id="pencarian-cepat" className="text-lg font-semibold">
            Pencarian Cepat Makam
          </h2>
          <p className="mb-4 text-muted">Ketik sebagian nama yang dimakamkan, misalnya &quot;Rita&quot;.</p>
          <QuickSearchForm />
        </Card>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Fitur Utama"
          title="Solusi Lengkap Informasi Pemakaman"
          description="Dirancang untuk memberikan kemudahan akses informasi secara cepat dan akurat."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <Card className="flex h-full gap-4 p-5 lg:flex-col">
                <IconBadge className="size-12">
                  <feature.icon className="size-5" />
                </IconBadge>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-[0.95rem] text-muted">{feature.text}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Lokasi TPU" className="border-t border-line/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <LocationSection settings={settings} />
        </div>
      </section>
    </>
  );
}
