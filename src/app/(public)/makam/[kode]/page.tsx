import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { Calendar, Hash, Info, Layers, Map as MapIcon, MapPin, QrCode } from "lucide-react";
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

  return (
    <>
      <PageHero
        title="Detail Makam"
        description={`Informasi lokasi makam di ${settings?.name ?? "TPU Astana Pratiksha Cianjur"}.`}
        crumbs={[{ href: "/cari-makam", label: "Cari Makam" }, { label: "Detail Makam" }]}
      />
      <div className="relative z-10 mx-auto -mt-8 max-w-5xl space-y-6 px-4 pb-16 sm:px-6">
        <Card className="p-5 sm:p-7">
          <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
            <GravePhoto photoPath={grave.photo_path} name={grave.deceased_name} eager />
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-3xl font-semibold leading-tight">{grave.deceased_name}</h2>
                <p className="mt-2 flex items-center gap-2 text-muted">
                  <Calendar className="size-5 text-primary" aria-hidden="true" />
                  <span>
                    Tanggal wafat: <strong className="font-semibold text-ink">{formatDate(grave.death_date)}</strong>
                  </span>
                </p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoTile icon={<Layers className="size-5" />} label="Blok Makam" value={grave.block_code ?? "-"} />
                <InfoTile icon={<Hash className="size-5" />} label="Nomor Makam" value={padGraveNumber(grave.grave_number)} />
                <InfoTile icon={<QrCode className="size-5" />} label="Kode Makam" value={grave.grave_code} />
                <InfoTile icon={<MapPin className="size-5" />} label="Lokasi TPU" value={settings?.name ?? "TPU Astana Pratiksha Cianjur"} />
              </dl>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/80 bg-surface/60 p-3">
      <IconBadge>{icon}</IconBadge>
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-serif text-xl font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}
