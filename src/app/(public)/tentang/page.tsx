import type { Metadata } from "next";
import { Database, Map as MapIcon, Search, ShieldCheck } from "lucide-react";
import { LocationSection } from "@/components/public/location-map-card";
import { PageHero } from "@/components/public/page-hero";
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
  { icon: ShieldCheck, title: "Privasi terjaga", text: "Data ahli waris hanya dapat diakses petugas yang berwenang." },
] as const;

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
              Halaman publik hanya menampilkan <strong>nama yang dimakamkan, tanggal wafat, blok, nomor dan kode makam, denah
              posisi, serta foto makam</strong> bila tersedia.
            </p>
            <p>
              Nama, nomor telepon, dan alamat ahli waris adalah <strong>data internal</strong> yang hanya dapat dilihat petugas
              yang telah masuk ke sistem.
            </p>
            <p className="text-muted">
              Sebagian data berasal dari catatan tulisan tangan dan sedang diverifikasi. Bila menemukan data yang keliru, silakan
              sampaikan kepada petugas TPU.
            </p>
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
