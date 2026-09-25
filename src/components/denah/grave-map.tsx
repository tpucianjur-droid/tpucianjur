"use client";

import { memo, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Crosshair, Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LoadingOverlay } from "@/components/ui/skeletons";
import { getBlockLayout, type BlockLayout, type LayoutRow } from "@/lib/denah/block-layouts";
import {
  blockExtent,
  canvasSize,
  cellCenter,
  cellKey,
  cellOrigin,
  CELL,
  resolvePosition,
  type BlockGridInput,
  type GravePositionInput,
  type ResolvedPosition,
} from "@/lib/denah/layout";
import { padGraveNumber } from "@/lib/format";
import { usePanZoom } from "./use-pan-zoom";

export type MapGrave = GravePositionInput & { id: string; grave_code: string; deceased_name: string };

type Props = {
  block: BlockGridInput & { code: string; name: string };
  graves: MapGrave[];
  /** Makam tujuan: denah otomatis fokus ke sini saat dibuka / tujuan berubah. */
  targetId?: string | null;
  /** Makam yang sedang dipilih (highlight "Dipilih"). Default = targetId. */
  selectedId?: string | null;
  onSelectGrave?: (id: string) => void;
  /** Dipanggil saat pengguna mengetuk area kosong. */
  onClearSelection?: () => void;
  /** Mode editor: tampilkan sel grid kosong yang dapat diklik. */
  editable?: boolean;
  onSelectCell?: (x: number, y: number) => void;
  className?: string;
  ariaLabel: string;
};

type Placed = { grave: MapGrave; pos: ResolvedPosition };
type Slot = { n: number; x: number; y: number };

const MAX_GRID_CELLS = 6000;
const GRAVE_OFFSET = { x: (CELL.width - CELL.graveWidth) / 2, y: (CELL.height - CELL.graveHeight) / 2 };
const GRAVE_RADIUS = 6;
/** Ruang di kanan baris untuk label rentang nomor ("154–186 · berlanjut"). */
const ROW_LABEL_SPACE = 132;

/** Tiga status visual: Terisi (hijau-abu), Kosong (pucat), Dipilih (hijau tua penuh + cincin). */
export const DENAH_COLORS = {
  land: "#eef4f0",
  landStroke: "#d2dfd6",
  bed: "#e0eae3",
  bedSimulated: "#e8efea",
  bedStroke: "#c6d6cc",
  axis: "#6b7f76",
  filled: "#c3d8ca",
  filledStroke: "#8fb09d",
  filledText: "#2c4d40",
  empty: "#fbfdfc",
  emptyStroke: "#cddad2",
  selected: "#174a3a",
  selectedStroke: "#0b2e23",
  selectedGlow: "#2f8a64",
} as const;

export function GraveMap({
  block,
  graves,
  targetId,
  selectedId,
  onSelectGrave,
  onClearSelection,
  editable = false,
  onSelectCell,
  className,
  ariaLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const layout = getBlockLayout(block.code);

  const placed = useMemo<Placed[]>(() => {
    const result: Placed[] = [];
    for (const grave of graves) {
      const pos = resolvePosition(grave, block);
      if (pos) result.push({ grave, pos });
    }
    return result;
  }, [graves, block]);

  // Petak layout yang belum punya data di sistem: terisi (<= filledThrough) atau kosong.
  const slots = useMemo(() => {
    const filled: Slot[] = [];
    const empty: Slot[] = [];
    if (!layout) return { filled, empty };
    const withData = new Set(graves.map((g) => g.grave_number));
    for (const row of layout.rows) {
      for (let n = row.start; n <= row.end; n++) {
        if (withData.has(n)) continue;
        const slot = { n, x: row.offset + n - row.start + 1, y: row.row };
        (n <= layout.filledThrough ? filled : empty).push(slot);
      }
    }
    return { filled, empty };
  }, [layout, graves]);

  const extent = useMemo(() => blockExtent(placed.map((p) => p.pos), block), [placed, block]);
  const size = useMemo(() => canvasSize(extent, layout ? ROW_LABEL_SPACE : 0), [extent, layout]);
  const highlightId = selectedId ?? targetId ?? null;
  const highlighted = placed.find((p) => p.grave.id === highlightId) ?? null;
  const target = placed.find((p) => p.grave.id === targetId) ?? null;

  const { zoomIn, zoomOut, fitAll, fitRect, focusOn, onKeyDown, measure } = usePanZoom(svgRef, size, (element) => {
    const graveId = element?.getAttribute("data-grave-id");
    if (graveId) return onSelectGrave?.(graveId);
    const cell = element?.getAttribute("data-cell");
    if (cell && onSelectCell) {
      const [x, y] = cell.split(":").map(Number);
      return onSelectCell(x, y);
    }
    onClearSelection?.();
  });

  /** Zoom ke makam: ±1 petak per 56px layar (7–18 petak), sehingga HP tetap terbaca & desktop tetap punya konteks. */
  const focusPlaced = (focus: Placed, animate: boolean) => {
    const center = cellCenter(focus.pos.x, focus.pos.y);
    const cells = Math.min(18, Math.max(7, (svgRef.current?.clientWidth ?? 400) / 56));
    focusOn(center.x, center.y, Math.min(size.width, CELL.width * cells), animate);
  };

  /** Tanpa tujuan: tampilkan area yang sudah terisi (bukan seluruh 1000 petak) agar makam tetap terbaca di HP. */
  const showOverview = (animate: boolean) => {
    const lastRow = layout ? filledRowCount(layout, placed) : 0;
    if (!layout || lastRow === 0) return fitAll(animate);
    const top = cellOrigin(1, 1).y - CELL.padding / 2;
    const bottom = cellOrigin(1, lastRow + 1).y + CELL.padding / 4;
    fitRect({ x: 0, y: top, w: size.width, h: bottom - top }, animate);
  };

  const focusHighlighted = (animate = false) => {
    const focus = highlighted ?? target;
    if (focus) return focusPlaced(focus, animate);
    showOverview(animate);
  };

  // Fokus otomatis ke makam tujuan saat denah dibuka / tujuan berubah.
  useEffect(() => {
    measure();
    if (target) focusPlaced(target, false);
    else showOverview(false);
    // Posisi awal sudah dihitung: sembunyikan overlay "Memuat denah…" & tampilkan denah (fade-in via CSS).
    if (rootRef.current) rootRef.current.dataset.ready = "true";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, block.code, size.width, size.height]);

  const occupied = useMemo(() => {
    const keys = new Set(placed.map((p) => cellKey(p.pos)));
    for (const slot of slots.filled) keys.add(cellKey(slot));
    return keys;
  }, [placed, slots.filled]);
  const showGrid = editable && extent.columns * extent.rows <= MAX_GRID_CELLS;

  return (
    <div ref={rootRef} className={cn("relative isolate overflow-hidden rounded-2xl border border-line bg-[#f4f8f5]", className)}>
      <LoadingOverlay label="Memuat denah…" className="denah-loading" />
      <svg
        ref={svgRef}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Escape" && selectedId) return onClearSelection?.();
          onKeyDown(event);
        }}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="denah-canvas block h-full w-full cursor-grab touch-none select-none outline-offset-[-3px] data-[dragging=true]:cursor-grabbing"
        style={{ fontFamily: "inherit" }}
      >
        <Ground extent={extent} size={size} layout={layout} />
        {layout ? <RowLabels layout={layout} ranges={!showGrid} /> : <Axis extent={extent} />}
        {showGrid ? <EmptyCells extent={extent} occupied={occupied} /> : <EmptySlots slots={slots.empty} />}
        <FilledSlots slots={slots.filled} />
        {highlighted && <Halo placed={highlighted} />}
        <GraveLayer placed={placed} highlightId={highlightId} />
        {highlighted && <SelectedRing placed={highlighted} />}
      </svg>

      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
        <div className="flex flex-col divide-y divide-line/80 overflow-hidden rounded-xl border border-line/80 bg-white/95 shadow-(--shadow-card) backdrop-blur-sm">
          <MapButton label="Perbesar" onClick={zoomIn}>
            <Plus className="size-[18px]" />
          </MapButton>
          <MapButton label="Perkecil" onClick={zoomOut}>
            <Minus className="size-[18px]" />
          </MapButton>
        </div>
        <div className="flex flex-col divide-y divide-line/80 overflow-hidden rounded-xl border border-line/80 bg-white/95 shadow-(--shadow-card) backdrop-blur-sm">
          <MapButton label="Tampilkan seluruh blok" onClick={() => fitAll(true)}>
            <Maximize2 className="size-4" />
          </MapButton>
          {(target || highlighted) && (
            <MapButton label="Fokus ke makam" onClick={() => focusHighlighted(true)}>
              <Crosshair className="size-[18px]" />
            </MapButton>
          )}
        </div>
      </div>
    </div>
  );
}

/** Jumlah baris layout yang memuat petak terisi (data lapangan atau data sistem). */
function filledRowCount(layout: BlockLayout, placed: Placed[]) {
  let last = 0;
  for (const row of layout.rows) if (row.start <= layout.filledThrough) last = row.row;
  for (const p of placed) if (p.pos.source === "layout") last = Math.max(last, Math.ceil(p.pos.y));
  return last;
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex size-11 items-center justify-center text-ink transition-colors hover:bg-primary-soft hover:text-primary active:bg-sage-strong sm:size-10"
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Latar tanah + petak baris. Dengan layout, setiap baris selebar jumlah petaknya (tepi blok tidak rata). */
const Ground = memo(function Ground({
  extent,
  size,
  layout,
}: {
  extent: { columns: number; rows: number };
  size: { width: number; height: number };
  layout: BlockLayout | null;
}) {
  const beds: { key: number; x: number; y: number; width: number; simulated: boolean }[] = layout
    ? layout.rows.map((row) => ({
        key: row.row,
        x: cellOrigin(row.offset + 1, row.row).x - 4,
        y: cellOrigin(1, row.row).y + 3,
        width: (row.end - row.start + 1) * CELL.width + 8,
        simulated: row.status === "simulated",
      }))
    : Array.from({ length: extent.rows }, (_, i) => ({
        key: i,
        x: CELL.padding - 6,
        y: cellOrigin(1, i + 1).y + 3,
        width: extent.columns * CELL.width + 12,
        simulated: false,
      }));
  return (
    <g aria-hidden="true">
      <rect x={4} y={4} width={size.width - 8} height={size.height - 8} rx={20} fill={DENAH_COLORS.land} stroke={DENAH_COLORS.landStroke} strokeWidth={1.5} />
      {beds.map((bed) => (
        <rect
          key={bed.key}
          x={bed.x}
          y={bed.y}
          width={bed.width}
          height={CELL.height - 6}
          rx={10}
          fill={bed.simulated ? DENAH_COLORS.bedSimulated : DENAH_COLORS.bed}
          stroke={bed.simulated ? DENAH_COLORS.bedStroke : "none"}
          strokeDasharray={bed.simulated ? "6 5" : undefined}
        />
      ))}
    </g>
  );
});

const Axis = memo(function Axis({ extent }: { extent: { columns: number; rows: number } }) {
  const step = extent.columns > 30 ? 5 : 1;
  const rowStep = extent.rows > 30 ? 5 : 1;
  return (
    <g fontSize={11} fontWeight={600} fill={DENAH_COLORS.axis} textAnchor="middle" aria-hidden="true">
      {Array.from({ length: extent.columns }, (_, i) => i + 1)
        .filter((c) => c === 1 || c % step === 0)
        .map((c) => (
          <text key={`c${c}`} x={cellOrigin(c, 1).x + CELL.width / 2} y={CELL.padding - 13}>
            {String(c).padStart(2, "0")}
          </text>
        ))}
      {Array.from({ length: extent.rows }, (_, i) => i + 1)
        .filter((r) => r === 1 || r % rowStep === 0)
        .map((r) => (
          <text key={`r${r}`} x={CELL.padding / 2 - 1} y={cellOrigin(1, r).y + CELL.height / 2 + 4}>
            {r}
          </text>
        ))}
    </g>
  );
});

/** Nomor baris di kiri + rentang nomor makam di ujung kanan setiap baris. */
const RowLabels = memo(function RowLabels({ layout, ranges }: { layout: BlockLayout; ranges: boolean }) {
  return (
    <g fontSize={11} fontWeight={600} fill={DENAH_COLORS.axis} aria-hidden="true">
      <text x={CELL.padding / 2 - 1} y={CELL.padding - 12} textAnchor="middle" fontSize={9} letterSpacing={0.4}>
        BRS
      </text>
      {layout.rows.map((row) => {
        const y = cellOrigin(1, row.row).y + CELL.height / 2 + 4;
        return (
          <g key={row.row}>
            <text x={CELL.padding / 2 - 1} y={y} textAnchor="middle">
              {row.row}
            </text>
            {ranges && (
              <text
                x={cellOrigin(row.offset + row.end - row.start + 2, row.row).x + 8}
                y={y}
                fontWeight={row.status === "simulated" ? 500 : 600}
                opacity={row.status === "simulated" ? 0.75 : 1}
              >
                {rowRangeLabel(row)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});

function rowRangeLabel(row: LayoutRow) {
  const range = `${padGraveNumber(row.start)}–${padGraveNumber(row.end)}`;
  if (row.status === "ongoing") return `${range} · berlanjut`;
  if (row.status === "simulated") return `${range} · simulasi`;
  return range;
}

const EmptyCells = memo(function EmptyCells({
  extent,
  occupied,
}: {
  extent: { columns: number; rows: number };
  occupied: Set<string>;
}) {
  const cells = [];
  for (let y = 1; y <= extent.rows; y++) {
    for (let x = 1; x <= extent.columns; x++) {
      if (occupied.has(cellKey({ x, y }))) continue;
      const o = cellOrigin(x, y);
      cells.push(
        <rect
          key={`${x}:${y}`}
          data-cell={`${x}:${y}`}
          x={o.x + GRAVE_OFFSET.x}
          y={o.y + GRAVE_OFFSET.y}
          width={CELL.graveWidth}
          height={CELL.graveHeight}
          rx={GRAVE_RADIUS}
          fill="#f7faf8"
          stroke="#b7c7bd"
          strokeDasharray="4 4"
          className="cursor-pointer hover:fill-white"
        />,
      );
    }
  }
  return <g>{cells}</g>;
});

/** Petak kosong: SATU elemen path untuk ratusan petak agar pan/zoom tetap ringan di HP. */
const EmptySlots = memo(function EmptySlots({ slots }: { slots: Slot[] }) {
  if (slots.length === 0) return null;
  return <path d={slotsPath(slots)} fill={DENAH_COLORS.empty} stroke={DENAH_COLORS.emptyStroke} strokeWidth={1} aria-hidden="true" />;
});

/** Petak terisi yang datanya belum tercatat di sistem (mis. 150–163): warna Terisi + nomor. */
const FilledSlots = memo(function FilledSlots({ slots }: { slots: Slot[] }) {
  if (slots.length === 0) return null;
  return (
    <g aria-hidden="true">
      <path d={slotsPath(slots)} fill={DENAH_COLORS.filled} stroke={DENAH_COLORS.filledStroke} strokeWidth={1} />
      <g fontSize={10.5} fontWeight={600} fill={DENAH_COLORS.filledText} textAnchor="middle" pointerEvents="none">
        {slots.map((slot) => {
          const o = cellOrigin(slot.x, slot.y);
          return (
            <text key={slot.n} x={o.x + CELL.width / 2} y={o.y + CELL.height / 2 + 4}>
              {padGraveNumber(slot.n)}
            </text>
          );
        })}
      </g>
    </g>
  );
});

/** Makam dengan data: Terisi; yang dipilih hijau tua penuh. Memo agar pan/zoom tidak me-render ulang ratusan elemen. */
const GraveLayer = memo(function GraveLayer({ placed, highlightId }: { placed: Placed[]; highlightId: string | null }) {
  return (
    <g>
      {placed.map(({ grave, pos }) => {
        const o = cellOrigin(pos.x, pos.y);
        const active = grave.id === highlightId;
        return (
          <g key={grave.id} data-grave-id={grave.id} className="denah-grave cursor-pointer">
            <title>{`${grave.deceased_name} — ${grave.grave_code}`}</title>
            <rect
              x={o.x + GRAVE_OFFSET.x}
              y={o.y + GRAVE_OFFSET.y}
              width={CELL.graveWidth}
              height={CELL.graveHeight}
              rx={GRAVE_RADIUS}
              fill={active ? DENAH_COLORS.selected : DENAH_COLORS.filled}
              stroke={active ? DENAH_COLORS.selectedStroke : DENAH_COLORS.filledStroke}
              strokeWidth={active ? 1.5 : 1}
              data-active={active || undefined}
              className="denah-stone"
            />
            <text
              x={o.x + CELL.width / 2}
              y={o.y + CELL.height / 2 + 4}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={active ? 700 : 600}
              fill={active ? "#ffffff" : DENAH_COLORS.filledText}
              pointerEvents="none"
            >
              {grave.grave_number != null ? padGraveNumber(grave.grave_number) : "?"}
            </text>
          </g>
        );
      })}
    </g>
  );
});

/** Glow lembut di bawah makam terpilih (digambar sebelum makam agar tidak menutupi tetangga). */
function Halo({ placed }: { placed: Placed }) {
  const c = cellCenter(placed.pos.x, placed.pos.y);
  return <circle cx={c.x} cy={c.y} r={30} fill={DENAH_COLORS.selectedGlow} opacity={0.2} pointerEvents="none" aria-hidden="true" />;
}

/** Cincin di sekeliling makam terpilih + denyut halus agar mudah ditemukan. */
function SelectedRing({ placed }: { placed: Placed }) {
  const o = cellOrigin(placed.pos.x, placed.pos.y);
  const c = cellCenter(placed.pos.x, placed.pos.y);
  const pad = 4;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect
        x={o.x + GRAVE_OFFSET.x - pad}
        y={o.y + GRAVE_OFFSET.y - pad}
        width={CELL.graveWidth + pad * 2}
        height={CELL.graveHeight + pad * 2}
        rx={GRAVE_RADIUS + pad}
        fill="none"
        stroke={DENAH_COLORS.selectedGlow}
        strokeWidth={2.5}
      />
      <circle cx={c.x} cy={c.y} r={30} fill="none" stroke={DENAH_COLORS.selectedGlow} strokeWidth={2} className="pulse-ring" />
    </g>
  );
}

function slotsPath(slots: Slot[]) {
  const w = CELL.graveWidth;
  const h = CELL.graveHeight;
  const r = GRAVE_RADIUS;
  return slots
    .map((slot) => {
      const o = cellOrigin(slot.x, slot.y);
      const x = o.x + GRAVE_OFFSET.x;
      const y = o.y + GRAVE_OFFSET.y;
      return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}z`;
    })
    .join("");
}
