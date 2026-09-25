import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { Calendar, Hash, Info, Layers, Map as MapIcon, MapPin, QrCode, Users } from "lucide-react";
import { BackToResults } from "@/components/public/back-to-results";
import { GravePhoto } from "@/components/public/grave-photo";
import { DirectionsButton, LocationCard } from "@/components/public/maps-buttons";
import { PageHero } from "@/components/public/page-hero";
import { LinkButton } from "@/components/ui/button";
import { Card, IconBadge } from "@/components/ui/card";
import { getPublicGraveByCode, getSettings } from "@/lib/data/public";
import { formatDate, padGraveNumber } from "@/lib/format";
import { normalizeGraveCodeParam, safeDecode } from "@/lib/graves/code";

export const dynamic = "force-dynamic";

async function loadGrave(rawCode: string) {
  const code = normalizeGraveCodeParam(rawCode);
  if (!code) notFound();
  if (code !== safeDecode(rawCode)) permanentRedirect(`/makam/${code}`);
  const grave = await getPublicGraveByCode(code);
  if (!grave) notFound();
  return grave;
}

export async function generateMetadata({ params }: PageProps<"/makam/[kode]">): Promise<Metadata> {
  const { kode } = await params;
  const code = normalizeGraveCodeParam(kode);
  return { title: code ? `Detail Makam ${code}` : "Detail Makam", robots: { index: false } };
}

export default async function GraveDetailPage({ params }: PageProps<"/makam/[kode]">) {
  const { kode } = await params;
  const [grave, settings] = await Promise.all([loadGrave(kode), getSettings()]);

  const tpuName = settings?.name ?? "TPU Astana Pratiksha Cianjur";
  const heirName = grave.heir_name?.trim();

  return (
    <>
      <PageHero
        title="Detail Makam"
        description={`Informasi lokasi makam di ${tpuName}.`}
        crumbs={[{ href: "/cari-makam", label: "Cari Makam" }, { label: "Detail Makam" }]}
      />
      <div className="relative z-10 mx-auto -mt-8 max-w-5xl space-y-6 px-4 pb-16 sm:px-6">
        <Card className="p-4 sm:p-7">
          <BackToResults />
          <h2 className="mt-1 break-words font-serif text-3xl font-semibold leading-tight sm:text-4xl">{grave.deceased_name}</h2>

          <dl className="mt-4 grid gap-2.5 sm:mt-5 md:grid-cols-2 md:gap-4">
            <InfoTile icon={<Calendar className="size-5 sm:size-6" />} label="Tanggal Wafat" value={formatDate(grave.death_date)} />
            <InfoTile icon={<Layers className="size-5 sm:size-6" />} label="Blok Makam" value={grave.block_code ?? "-"} />
            <InfoTile icon={<Hash className="size-5 sm:size-6" />} label="Nomor Makam" value={padGraveNumber(grave.grave_number)} />
            <InfoTile icon={<QrCode className="size-5 sm:size-6" />} label="Kode Makam" value={grave.grave_code} />
            {heirName && <InfoTile icon={<Users className="size-5 sm:size-6" />} label="Ahli Waris" value={heirName} />}
            <InfoTile icon={<MapPin className="size-5 sm:size-6" />} label="Lokasi TPU" value={tpuName} />
          </dl>

          <div className="mt-4 grid gap-2.5 sm:mt-6 md:grid-cols-2 md:gap-4">
            <DirectionsButton settings={settings} className="w-full" />
            <LinkButton
              href={`/makam/${grave.grave_code}/lokasi`}
              variant="secondary"
              size="lg"
              className="w-full"
              icon={<MapIcon className="size-5" aria-hidden="true" />}
            >
              Lihat Posisi Makam
            </LinkButton>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h2 className="mb-3 font-semibold">Foto Makam</h2>
          <div className="max-w-md">
            <GravePhoto photoPath={grave.photo_path} name={grave.deceased_name} />
          </div>
        </Card>

        <Card className="flex gap-4 bg-sage/60 p-5">
          <IconBadge tone="primary">
            <Info className="size-5" />
          </IconBadge>
          <div>
            <h2 className="font-semibold">Panduan Ziarah</h2>
            <p className="mt-1 text-[0.95rem] text-muted">
              Gunakan kode makam <strong className="text-ink">{grave.grave_code}</strong> dan informasi blok untuk memudahkan
              pencarian di area TPU. Tekan &quot;Petunjuk ke TPU&quot; untuk rute perjalanan, lalu &quot;Lihat Posisi Makam&quot;
              setelah tiba.
            </p>
          </div>
        </Card>

        <LocationCard settings={settings} />
      </div>
    </>
  );
}

/** Kartu informasi seragam: ikon lingkaran hijau muda, label, lalu nilai (nilai panjang wrap). */
function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface/60 px-3 py-2.5 sm:gap-4 sm:p-5">
      <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-primary sm:size-14">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-sm text-muted sm:text-base">{label}</dt>
        <dd className="break-words font-serif text-lg font-semibold leading-snug text-ink sm:text-2xl">{value}</dd>
      </div>
    </div>
  );
}
