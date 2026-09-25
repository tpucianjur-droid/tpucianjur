import Link from "next/link";
import { FileText, MapPin } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GraveSummary } from "@/lib/graves/types";

export type { GraveSummary };

function GraveIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-6 sm:size-7" aria-hidden="true">
      <path d="M14 40V20a10 10 0 0 1 20 0v20Z" fill="currentColor" />
      <path d="M24 16v10M19.5 20.5h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M9 41h30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Ringkasan hasil pencarian: cukup untuk mengenali orang yang dicari. Informasi lengkap ada di halaman Detail. */
export function GraveResultCard({ grave }: { grave: GraveSummary }) {
  const detailHref = `/makam/${grave.grave_code}`;
  const heirName = grave.heir_name?.trim();
  return (
    <Card className="p-4 sm:p-5">
      <article className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sage text-primary sm:size-14">
            <GraveIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-serif text-xl font-semibold leading-snug">
              <Link href={detailHref} className="hover:text-primary hover:underline">
                {grave.deceased_name}
              </Link>
            </h3>
            {heirName && (
              <p className="mt-0.5 break-words text-[0.95rem] leading-snug text-muted">
                Ahli Waris: <span className="font-medium text-ink">{heirName}</span>
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:gap-3">
          <Link href={detailHref} className={buttonClass("secondary", "md", "md:min-w-32")}>
            <FileText className="size-4" aria-hidden="true" />
            Detail
            <span className="sr-only"> {grave.deceased_name}</span>
          </Link>
          <Link href={`${detailHref}/lokasi`} className={buttonClass("primary", "md", "md:min-w-40")}>
            <MapPin className="size-4" aria-hidden="true" />
            Lihat Posisi
            <span className="sr-only"> {grave.deceased_name}</span>
          </Link>
        </div>
      </article>
    </Card>
  );
}
