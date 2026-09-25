import type { Metadata } from "next";
import { Database, Map as MapIcon, Search, ShieldCheck } from "lucide-react";
import { LocationSection } from "@/components/public/location-map-card";
import { PageHero } from "@/components/public/page-hero";
import { ExternalLinkButton } from "@/components/ui/button";
import { Card, IconBadge, SectionHeading } from "@/components/ui/card";
import { APP } from "@/lib/config";
import { getSettings } from "@/lib/data/public";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tentang",
  description: `Tentang ${APP.name}.`,
};

const GOALS = [
  { icon: Search, title: "Pencarian cepat", text: "Masyarakat dapat mencari makam hanya dengan sebagian nama." },
  { icon: MapIcon, title: "Dua tahap navigasi", text: "Google Maps menuju TPU, lalu denah internal untuk menemukan posisi makam." },
  { icon: Database, title: "Data terstruktur", text: "Catatan tulisan tangan didigitalisasi dan diverifikasi petugas secara bertahap." },
  { icon: ShieldCheck, title: "Privasi terjaga", text: "Nomor telepon dan alamat ahli waris hanya dapat diakses petugas yang berwenang." },
] as const;

const WHATSAPP = { display: "0853-5333-0411", url: "https://wa.me/6285353330411" } as const;

/** Logo WhatsApp (SVG inline, tanpa dependency tambahan). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export default async function TentangPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero
        eyebrow="Tentang Sistem"
        title={APP.shortName}
        accent={APP.subtitle}
        description={`${APP.name} membantu keluarga dan peziarah menemukan makam dengan mudah.`}
        crumbs={[{ label: "Tentang" }]}
      />
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
        <section className="space-y-6">
          <SectionHeading align="left" eyebrow="Tujuan" title="Mengapa aplikasi ini dibuat" />
          <ul className="grid gap-4 sm:grid-cols-2">
            {GOALS.map((goal) => (
              <li key={goal.title}>
                <Card className="flex h-full gap-4 p-5">
                  <IconBadge>
                    <goal.icon className="size-5" />
                  </IconBadge>
                  <div>
                    <h3 className="font-semibold">{goal.title}</h3>
                    <p className="mt-1 text-[0.95rem] text-muted">{goal.text}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <SectionHeading align="left" eyebrow="Privasi Data" title="Informasi yang ditampilkan" />
          <Card className="space-y-3 p-5 text-[0.95rem] leading-relaxed">
            <p>
              Halaman publik hanya menampilkan <strong>nama yang dimakamkan, tanggal wafat, blok, nomor dan kode makam, nama
              ahli waris, denah posisi, serta foto makam</strong> bila tersedia.
            </p>
            <p>
              Nomor telepon dan alamat ahli waris adalah <strong>data internal</strong> yang hanya dapat dilihat petugas yang
              telah masuk ke sistem.
            </p>
            <p className="text-muted">
              Sebagian data berasal dari catatan tulisan tangan dan sedang diverifikasi. Bila menemukan data yang keliru, silakan
              sampaikan kepada petugas TPU.
            </p>
          </Card>
        </section>

        <section className="space-y-4">
          <SectionHeading
            align="left"
            title="Hubungi Kami"
            description="Untuk informasi lebih lanjut mengenai data makam atau layanan TPU Astana Pratiksha Cianjur, silakan hubungi kami melalui WhatsApp."
          />
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <IconBadge>
                <WhatsAppIcon className="size-5" />
              </IconBadge>
              <div className="min-w-0">
                <p className="text-sm text-muted">WhatsApp</p>
                <a
                  href={WHATSAPP.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold tabular-nums text-ink transition-colors hover:text-primary"
                >
                  {WHATSAPP.display}
                  <span className="sr-only"> (membuka WhatsApp di tab baru)</span>
                </a>
              </div>
            </div>
            <ExternalLinkButton
              href={WHATSAPP.url}
              className="w-full sm:w-auto"
              icon={<WhatsAppIcon className="size-5" />}
            >
              Hubungi via WhatsApp
              <span className="sr-only"> (membuka WhatsApp di tab baru)</span>
            </ExternalLinkButton>
          </Card>
        </section>

        <section aria-label="Lokasi TPU">
          <LocationSection
            settings={settings}
            eyebrow="Lokasi"
            title="Lokasi TPU"
            description="Ketuk peta untuk membuka lokasi di Google Maps, atau gunakan petunjuk arah dari posisi Anda."
          />
        </section>
      </div>
    </>
  );
}
