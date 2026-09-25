"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ChevronRight, Info, Undo2 } from "lucide-react";
import { MESSAGES } from "@/lib/config";
import { getBlockLayout } from "@/lib/denah/block-layouts";
import { padGraveNumber } from "@/lib/format";
import type { BlockGridInput } from "@/lib/denah/layout";
import { DENAH_COLORS, GraveMap, type MapGrave } from "./grave-map";

type Props = {
  block: BlockGridInput & { code: string; name: string };
  graves: MapGrave[];
  target: MapGrave | null;
  /** Tampilkan info makam tujuan di bawah denah. Matikan bila info sudah ada di panel lain (halaman posisi makam). */
  showTargetSummary?: boolean;
};

export function PublicDenah({ block, graves, target, showTargetSummary = true }: Props) {
  const targetId = target?.id ?? null;
  // Makam tujuan otomatis terpilih; ketuk makam lain => highlight & info pindah ke makam itu.
  const [selectedId, setSelectedId] = useState<string | null>(targetId);
  const [prevTargetId, setPrevTargetId] = useState(targetId);
  if (prevTargetId !== targetId) {
    setPrevTargetId(targetId);
    setSelectedId(targetId);
  }
  const selected = graves.find((g) => g.id === selectedId) ?? null;
  const isTarget = Boolean(selected && selected.id === targetId);
  const layoutNote = describeLayout(block.code);

  return (
    <div className="space-y-3">
      <GraveMap
        block={block}
        graves={graves}
        targetId={targetId}
        selectedId={selectedId}
        onSelectGrave={setSelectedId}
        onClearSelection={() => setSelectedId(targetId)}
        className="h-[62vh] min-h-80 md:h-[560px]"
        ariaLabel={
          selected
            ? `Denah ${block.name}. Makam ${selected.deceased_name}, kode ${selected.grave_code}, ditandai hijau tua.`
            : `Denah ${block.name} dengan ${graves.length} makam.`
        }
      />

      {selected && (showTargetSummary || !isTarget) && (
        <SelectedInfo
          grave={selected}
          blockName={block.name}
          label={isTarget ? "Makam yang dicari" : "Makam dipilih"}
          showDetailLink={!isTarget || showTargetSummary}
          onBackToTarget={target && !isTarget ? () => setSelectedId(target.id) : undefined}
        />
      )}

      <Legend />

      <p className="flex gap-2 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {MESSAGES.denahDisclaimer}
          {layoutNote && ` ${layoutNote}`} Geser untuk memindahkan denah, cubit/scroll untuk memperbesar, ketuk makam untuk
          melihat nama.
        </span>
      </p>
    </div>
  );
}

/** Catatan status layout dari config: baris yang masih berlanjut & baris simulasi. */
function describeLayout(blockCode: string) {
  const layout = getBlockLayout(blockCode);
  if (!layout) return null;
  const notes: string[] = [];
  const ongoing = layout.rows.filter((r) => r.status === "ongoing").map((r) => r.row);
  if (ongoing.length > 0) notes.push(`Baris ${ongoing.join(", ")} masih berlanjut (belum final)`);
  if (layout.rows.some((r) => r.status === "simulated")) notes.push("baris bertanda “simulasi” adalah perkiraan sementara");
  return notes.length > 0 ? `${notes.join("; ")}.`.replace(/^./, (c) => c.toUpperCase()) : null;
}

/** Info makam terpilih di BAWAH denah (bukan tooltip melayang): tidak pernah terpotong atau menutupi denah. */
function SelectedInfo({
  grave,
  blockName,
  label,
  showDetailLink,
  onBackToTarget,
}: {
  grave: MapGrave;
  blockName: string;
  label: string;
  showDetailLink: boolean;
  onBackToTarget?: () => void;
}) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Swatch kind="selected" className="mt-1" />
        <p className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-primary">{label}</span>
          <span className="block break-words font-semibold leading-snug">{grave.deceased_name}</span>
          <span className="text-sm text-muted">
            {blockName} · No. {padGraveNumber(grave.grave_number)} · Kode {grave.grave_code}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 pl-7 sm:pl-0">
        {onBackToTarget && (
          <button
            type="button"
            onClick={onBackToTarget}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-muted hover:text-primary"
          >
            <Undo2 className="size-4" aria-hidden="true" /> Makam tujuan
          </button>
        )}
        {showDetailLink && (
          <Link
            href={`/makam/${grave.grave_code}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1 font-semibold text-primary hover:underline"
          >
            Detail makam <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

const SWATCH: Record<"filled" | "empty" | "selected" | "cell", CSSProperties> = {
  filled: { background: DENAH_COLORS.filled, borderColor: DENAH_COLORS.filledStroke },
  empty: { background: DENAH_COLORS.empty, borderColor: DENAH_COLORS.emptyStroke },
  selected: {
    background: DENAH_COLORS.selected,
    borderColor: DENAH_COLORS.selectedStroke,
    boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${DENAH_COLORS.selectedGlow}`,
  },
  cell: { background: "#f7faf8", borderColor: "#b7c7bd", borderStyle: "dashed" },
};

function Swatch({ kind, className }: { kind: keyof typeof SWATCH; className?: string }) {
  return <span className={`inline-block h-5 w-3.5 shrink-0 rounded-[4px] border ${className ?? ""}`} style={SWATCH[kind]} aria-hidden="true" />;
}

export function Legend({ editor = false }: { editor?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Legenda denah">
      <li className="flex items-center gap-2">
        <Swatch kind="filled" />
        <span>Terisi</span>
      </li>
      <li className="flex items-center gap-2">
        <Swatch kind={editor ? "cell" : "empty"} />
        <span>{editor ? "Kosong (klik untuk memindahkan)" : "Kosong"}</span>
      </li>
      <li className="flex items-center gap-2">
        <Swatch kind="selected" className="ml-0.5" />
        <span>Dipilih</span>
      </li>
    </ul>
  );
}
