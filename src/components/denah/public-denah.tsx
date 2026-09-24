"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Info } from "lucide-react";
import { MESSAGES } from "@/lib/config";
import { padGraveNumber } from "@/lib/format";
import type { BlockGridInput } from "@/lib/denah/layout";
import { GraveMap, type MapGrave } from "./grave-map";

type Props = {
  block: BlockGridInput & { code: string; name: string };
  graves: MapGrave[];
  target: MapGrave | null;
  /** Tampilkan ringkasan makam tujuan di bawah denah. Matikan bila info sudah ada di panel lain (halaman posisi makam). */
  showTargetSummary?: boolean;
};

export function PublicDenah({ block, graves, target, showTargetSummary = true }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = graves.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <GraveMap
        block={block}
        graves={graves}
        targetId={target?.id ?? null}
        selectedId={selectedId}
        onSelectGrave={(id) => setSelectedId((current) => (current === id ? null : id))}
        onClearSelection={() => setSelectedId(null)}
        popover={selected && <GravePopover grave={selected} blockName={block.name} isTarget={selected.id === target?.id} />}
        className="h-[62vh] min-h-80 md:h-[560px]"
        ariaLabel={
          target
            ? `Denah ${block.name}. Makam ${target.deceased_name}, kode ${target.grave_code}, ditandai hijau. Makam lain berwarna abu-abu.`
            : `Denah ${block.name} dengan ${graves.length} makam.`
        }
      />

      <Legend targetName={target?.deceased_name} showSelected={Boolean(selected && selected.id !== target?.id)} />

      {showTargetSummary && target && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
          <p>
            <span className="block font-semibold">{target.deceased_name}</span>
            <span className="text-sm text-muted">
              {block.name} · No. {padGraveNumber(target.grave_number)} · Kode {target.grave_code}
            </span>
          </p>
          <Link
            href={`/makam/${target.grave_code}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-primary hover:underline"
          >
            Detail makam <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <p className="flex gap-2 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {MESSAGES.denahDisclaimer} Geser untuk memindahkan denah, cubit/scroll untuk memperbesar, ketuk makam untuk melihat nama.
        </span>
      </p>
    </div>
  );
}

function GravePopover({ grave, blockName, isTarget }: { grave: MapGrave; blockName: string; isTarget: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="break-words text-[0.95rem] font-semibold leading-snug text-ink">{grave.deceased_name}</p>
      <p className="text-xs text-muted">
        {blockName} · No. {padGraveNumber(grave.grave_number)} · {grave.grave_code}
      </p>
      {!isTarget && (
        <Link
          href={`/makam/${grave.grave_code}`}
          className="-ml-1 mt-1 inline-flex min-h-8 items-center gap-0.5 rounded-md px-1 text-sm font-semibold text-primary hover:underline"
        >
          Lihat detail <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function Legend({
  targetName,
  editor = false,
  showSelected = false,
}: {
  targetName?: string;
  editor?: boolean;
  showSelected?: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Legenda denah">
      <li className="flex items-center gap-2">
        <span className="inline-block h-5 w-4 rounded-t-full rounded-b-[3px] bg-primary shadow-sm" aria-hidden="true" />
        <span>
          {editor ? "Makam dipilih" : "Makam yang dicari"}
          {targetName && <strong className="font-semibold"> ({targetName})</strong>}
        </span>
      </li>
      {showSelected && (
        <li className="flex items-center gap-2">
          <span className="inline-block h-5 w-4 rounded-t-full rounded-b-[3px] bg-gold shadow-sm" aria-hidden="true" />
          <span>Makam yang Anda ketuk</span>
        </li>
      )}
      <li className="flex items-center gap-2">
        <span className="inline-block h-5 w-4 rounded-t-full rounded-b-[3px] border border-grave-stroke bg-grave" aria-hidden="true" />
        <span>Makam lainnya</span>
      </li>
      {editor && (
        <li className="flex items-center gap-2">
          <span className="inline-block h-5 w-4 rounded-md border border-dashed border-[#b7c7bd] bg-white" aria-hidden="true" />
          <span>Petak kosong (klik untuk memindahkan)</span>
        </li>
      )}
    </ul>
  );
}
