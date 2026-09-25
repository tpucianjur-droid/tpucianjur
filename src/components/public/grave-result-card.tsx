import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, Hash, Layers, MapPin, QrCode } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, padGraveNumber } from "@/lib/format";
import type { GraveSummary } from "@/lib/graves/types";

export type { GraveSummary };

function GraveIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" aria-hidden="true">
      <path d="M14 40V20a10 10 0 0 1 20 0v20Z" fill="currentColor" />
      <path d="M24 16v10M19.5 20.5h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 41h30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function GraveResultCard({ grave }: { grave: GraveSummary }) {
  const detailHref = `/makam/${grave.grave_code}`;
  const heirName = grave.heir_name?.trim();
  return (
    <Card className="p-4 sm:p-5">
      <article className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sage text-primary">
            <GraveIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-xl font-semibold leading-snug">
              <Link href={detailHref} className="hover:text-primary hover:underline">
                {grave.deceased_name}
              </Link>
            </h3>
            <p className="text-[0.95rem] text-muted">Wafat: {formatDate(grave.death_date)}</p>
            {heirName && (
              <p className="break-words text-[0.95rem] leading-snug text-muted">
                Ahli Waris: <span className="font-medium text-ink">{heirName}</span>
              </p>
            )}
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm sm:max-w-md">
              <Meta icon={<Layers className="size-4" />} label="Blok" value={grave.block_code ?? "-"} />
              <Meta icon={<Hash className="size-4" />} label="Nomor" value={padGraveNumber(grave.grave_number)} />
              <Meta icon={<QrCode className="size-4" />} label="Kode" value={grave.grave_code} />
            </dl>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
          <Link href={detailHref} className={buttonClass("secondary", "md")}>
            <FileText className="size-4" aria-hidden="true" />
            Detail
            <span className="sr-only"> {grave.deceased_name}</span>
          </Link>
          <Link href={`${detailHref}/lokasi`} className={buttonClass("primary", "md")}>
            <MapPin className="size-4" aria-hidden="true" />
            Lihat Posisi
            <span className="sr-only"> {grave.deceased_name}</span>
          </Link>
        </div>
      </article>
    </Card>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="truncate font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}
