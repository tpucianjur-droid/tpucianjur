import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { Grid3x3, Hash, Layers, Map as MapIcon, MapPinOff, QrCode } from "lucide-react";
import { PublicDenah } from "@/components/denah/public-denah";
import { DirectionsButton, LocationCard } from "@/components/public/maps-buttons";
import { PageHero } from "@/components/public/page-hero";
import { LinkButton } from "@/components/ui/button";
import { Card, IconBadge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { MESSAGES } from "@/lib/config";
import { getActiveBlocks, getDenahGraves, getPublicGraveByCode, getSettings } from "@/lib/data/public";
import { resolvePosition } from "@/lib/denah/layout";
import { padGraveNumber } from "@/lib/format";
import { normalizeGraveCodeParam, safeDecode } from "@/lib/graves/code";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/makam/[kode]/lokasi">): Promise<Metadata> {
  const { kode } = await params;
  const code = normalizeGraveCodeParam(kode);
  return { title: code ? `Posisi Makam ${code}` : "Posisi Makam", robots: { index: false } };
}

export default async function GraveLocationPage({ params }: PageProps<"/makam/[kode]/lokasi">) {
  const { kode } = await params;
  const code = normalizeGraveCodeParam(kode);
  if (!code) notFound();
  if (code !== safeDecode(kode)) permanentRedirect(`/makam/${code}/lokasi`);

  const [grave, settings, blocks] = await Promise.all([getPublicGraveByCode(code), getSettings(), getActiveBlocks()]);
  if (!grave) notFound();

  const block = blocks.find((b) => b.code === grave.block_code) ?? null;
  const graves = block ? await getDenahGraves(block.code) : [];
  const target = graves.find((g) => g.id === grave.id) ?? null;
  const position = block && target ? resolvePosition(target, block) : null;

  return (
    <>
      <PageHero
        title="Posisi Makam / Denah"
        description="Lihat posisi makam pada denah area TPU. Gunakan setelah Anda tiba di lokasi."
        crumbs={[
          { href: "/cari-makam", label: "Cari Makam" },
          { href: `/makam/${grave.grave_code}`, label: "Detail Makam" },
          { label: "Posisi Makam" },
        ]}
      />
      <div className="relative z-10 mx-auto -mt-8 grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_340px]">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBadge>
                <MapIcon className="size-5" />
              </IconBadge>
              <div>
                <h2 className="font-serif text-xl font-semibold">Denah {block?.name ?? `Blok ${grave.block_code ?? "-"}`}</h2>
                <p className="text-sm text-muted">Makam tujuan ditandai hijau. Ketuk makam lain untuk melihat namanya.</p>
              </div>
            </div>
            <LinkButton href={block ? `/denah?blok=${block.code}` : "/denah"} variant="secondary">
              Lihat blok lain
            </LinkButton>
          </div>

          {block && target && position ? (
            <PublicDenah block={block} graves={graves} target={target} showTargetSummary={false} />
          ) : (
            <EmptyState icon={<MapPinOff className="size-6" />} title={MESSAGES.mapNotSet}>
              Posisi makam ini pada denah belum diatur oleh petugas. Gunakan kode makam <strong>{grave.grave_code}</strong> dan
              tanyakan kepada petugas TPU setibanya di lokasi.
            </EmptyState>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="inline-block h-3.5 w-2.5 rounded-t-full rounded-b-[2px] bg-primary" aria-hidden="true" />
              Makam tujuan
            </p>
            <h2 className="mb-3 mt-1.5 break-words font-serif text-2xl font-semibold leading-tight">{grave.deceased_name}</h2>
            <dl className="divide-y divide-line/70">
              <Row icon={<Layers className="size-4" />} label="Blok" value={grave.block_code ?? "-"} />
              <Row icon={<Hash className="size-4" />} label="No. Makam" value={padGraveNumber(grave.grave_number)} />
              <Row icon={<QrCode className="size-4" />} label="Kode Makam" value={grave.grave_code} />
              {position && (
                <Row
                  icon={<Grid3x3 className="size-4" />}
                  label="Posisi di denah"
                  value={`Baris ${Math.round(position.y)} · Kolom ${Math.round(position.x)}`}
                />
              )}
            </dl>
          </Card>

          <Card className="bg-sage/50 p-5">
            <h2 className="mb-3 font-semibold">Petunjuk Lokasi di TPU</h2>
            <ol className="space-y-3">
              <Step n={1}>Masuk melalui pintu utama {settings?.name ?? "TPU"}.</Step>
              <Step n={2}>
                Arahkan ke <strong>{block?.name ?? `Blok ${grave.block_code ?? "-"}`}</strong> sesuai denah.
              </Step>
              <Step n={3}>
                {position ? (
                  <>
                    Cari <strong>baris {Math.round(position.y)}</strong>, <strong>kolom {Math.round(position.x)}</strong> — makam{" "}
                    <strong>{grave.grave_code}</strong> yang ditandai pada denah.
                  </>
                ) : (
                  <>
                    Cari makam dengan kode <strong>{grave.grave_code}</strong>.
                  </>
                )}
              </Step>
            </ol>
          </Card>

          <LocationCard settings={settings} compact />
          <DirectionsButton settings={settings} className="w-full" label="Buka Google Maps" />
        </aside>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="flex items-center gap-2 text-muted">
        <span className="text-primary" aria-hidden="true">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-primary" aria-hidden="true">
        {n}
      </span>
      <span className="text-[0.95rem]">{children}</span>
    </li>
  );
}
