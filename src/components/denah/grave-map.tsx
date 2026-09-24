"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { Crosshair, Maximize2, Minus, Plus, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LoadingOverlay } from "@/components/ui/skeletons";
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
import { usePanZoom, type ViewBox } from "./use-pan-zoom";

export type MapGrave = GravePositionInput & { id: string; grave_code: string; deceased_name: string };

type Props = {
  block: BlockGridInput & { code: string; name: string };
  graves: MapGrave[];
  /** Makam tujuan (highlight hijau penuh + cincin). */
  targetId?: string | null;
  /** Makam yang sedang dipilih/diketuk (highlight emas penuh). */
  selectedId?: string | null;
  onSelectGrave?: (id: string) => void;
  /** Dipanggil saat pengguna mengetuk area kosong / menutup tooltip. */
  onClearSelection?: () => void;
  /** Isi tooltip untuk makam terpilih (HTML, ukuran tetap, selalu di dalam area denah). */
  popover?: ReactNode;
  /** Mode editor: tampilkan sel grid kosong yang dapat diklik. */
  editable?: boolean;
  onSelectCell?: (x: number, y: number) => void;
  className?: string;
  ariaLabel: string;
};

type Placed = { grave: MapGrave; pos: ResolvedPosition };
type Size = { width: number; height: number };

const MAX_GRID_CELLS = 6000;
const GRAVE_OFFSET = { x: (CELL.width - CELL.graveWidth) / 2, y: (CELL.height - CELL.graveHeight) / 2 };
const EDGE_MARGIN = 8;
const POPOVER_GAP = 10;

const COLORS = {
  land: "#e7efe9",
  landStroke: "#d2dfd6",
  bed: "#d9e6dd",
  axis: "#7b8d85",
  grave: "#c9cfcc",
  graveStroke: "#b3bbb7",
  graveText: "#5b6d65",
  target: "#174a3a",
  targetStroke: "#0f3a2d",
  selected: "#9a7b45",
  selectedStroke: "#7e6438",
} as const;

export function GraveMap({
  block,
  graves,
  targetId,
  selectedId,
  onSelectGrave,
  onClearSelection,
  popover,
  editable = false,
  onSelectCell,
  className,
  ariaLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const lastView = useRef<{ view: ViewBox; container: Size } | null>(null);

  const placed = useMemo<Placed[]>(() => {
    const result: Placed[] = [];
    for (const grave of graves) {
      const pos = resolvePosition(grave, block);
      if (pos) result.push({ grave, pos });
    }
    return result;
  }, [graves, block]);

  const extent = useMemo(() => blockExtent(placed.map((p) => p.pos), block), [placed, block]);
  const size = useMemo(() => canvasSize(extent), [extent]);
  const target = placed.find((p) => p.grave.id === targetId) ?? null;
  const selected = placed.find((p) => p.grave.id === selectedId) ?? null;
  const popoverAnchor = popover && selected ? selected : null;

  /** Posisikan tooltip dalam piksel layar: di atas makam, pindah ke bawah bila tidak muat, tidak keluar tepi/menimpa tombol. */
  const positionPopover = useCallback(() => {
    const el = popoverRef.current;
    const state = lastView.current;
    if (!el || !state || !popoverAnchor) return;
    const { view, container } = state;
    const scale = container.width / view.w;
    const origin = cellOrigin(popoverAnchor.pos.x, popoverAnchor.pos.y);
    const cx = (origin.x + CELL.width / 2 - view.x) * scale;
    const top = (origin.y + GRAVE_OFFSET.y - view.y) * scale;
    const bottom = (origin.y + GRAVE_OFFSET.y + CELL.graveHeight - view.y) * scale;

    const visible = cx > 0 && cx < container.width && bottom > 0 && top < container.height;
    el.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const fitsAbove = top - POPOVER_GAP - h >= EDGE_MARGIN;
    const fitsBelow = bottom + POPOVER_GAP + h <= container.height - EDGE_MARGIN;
    const placeBelow = !fitsAbove && fitsBelow;
    const y = placeBelow
      ? bottom + POPOVER_GAP
      : clamp(top - POPOVER_GAP - h, EDGE_MARGIN, container.height - h - EDGE_MARGIN);

    // Hindari toolbar zoom di kanan atas.
    let rightLimit = container.width - EDGE_MARGIN;
    const controls = controlsRef.current;
    if (controls && y < controls.offsetTop + controls.offsetHeight + EDGE_MARGIN) {
      rightLimit = Math.min(rightLimit, controls.offsetLeft - EDGE_MARGIN);
    }
    const x = clamp(cx - w / 2, EDGE_MARGIN, Math.max(EDGE_MARGIN, rightLimit - w));

    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    el.dataset.placement = placeBelow ? "below" : "above";
    el.style.setProperty("--arrow-x", `${Math.round(clamp(cx - x, 16, w - 16))}px`);
  }, [popoverAnchor]);

  const { zoomIn, zoomOut, fitAll, focusOn, panBy, onKeyDown, measure } = usePanZoom(
    svgRef,
    size,
    (element) => {
      const graveId = element?.getAttribute("data-grave-id");
      if (graveId) return onSelectGrave?.(graveId);
      const cell = element?.getAttribute("data-cell");
      if (cell && onSelectCell) {
        const [x, y] = cell.split(":").map(Number);
        return onSelectCell(x, y);
      }
      onClearSelection?.();
    },
    (view, container) => {
      lastView.current = { view, container };
      positionPopover();
    },
  );

  const focusTarget = (animate = false) => {
    const focus = target ?? selected;
    if (!focus) return fitAll(animate);
    const center = cellCenter(focus.pos.x, focus.pos.y);
    focusOn(center.x, center.y, Math.min(size.width, CELL.width * 8), animate);
  };

  // Fokus otomatis ke makam tujuan saat denah dibuka / tujuan berubah.
  useEffect(() => {
    measure();
    focusTarget();
    // Posisi awal sudah dihitung: sembunyikan overlay "Memuat denah…" & tampilkan denah (fade-in via CSS).
    if (rootRef.current) rootRef.current.dataset.ready = "true";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, block.code, size.width, size.height]);

  // Tooltip baru muncul / isinya berubah: hitung ulang posisinya sebelum digambar.
  useLayoutEffect(() => {
    positionPopover();
  }, [positionPopover, popover]);

  // Makam baru dipilih tetapi ruang di atasnya tidak cukup untuk tooltip: geser denah sedikit ke bawah
  // agar tooltip tampil di atas makam dan tidak menutupi makam lain (dibatasi tepi blok).
  useEffect(() => {
    const el = popoverRef.current;
    const state = lastView.current;
    if (!el || !state || !popoverAnchor) return;
    const scale = state.container.width / state.view.w;
    const top = (cellOrigin(popoverAnchor.pos.x, popoverAnchor.pos.y).y + GRAVE_OFFSET.y - state.view.y) * scale;
    const needed = el.offsetHeight + POPOVER_GAP + EDGE_MARGIN;
    if (top < needed) panBy(0, (top - needed) / scale, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const occupied = useMemo(() => new Set(placed.map((p) => cellKey(p.pos))), [placed]);
  const showGrid = editable && extent.columns * extent.rows <= MAX_GRID_CELLS;

  return (
    <div ref={rootRef} className={cn("relative isolate overflow-hidden rounded-2xl border border-line bg-[#f1f6f3]", className)}>
      <LoadingOverlay label="Memuat denah…" className="denah-loading" />
      <svg
        ref={svgRef}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Escape" && selected) return onClearSelection?.();
          onKeyDown(event);
        }}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="denah-canvas block h-full w-full cursor-grab touch-none select-none outline-offset-[-3px] data-[dragging=true]:cursor-grabbing"
        style={{ fontFamily: "inherit" }}
      >
        <Ground extent={extent} size={size} />
        <Axis extent={extent} />
        {showGrid && <EmptyCells extent={extent} occupied={occupied} />}
        {target && <Halo placed={target} color={COLORS.target} />}
        {selected && selected !== target && <Halo placed={selected} color={COLORS.selected} />}
        <GraveLayer placed={placed} targetId={targetId ?? null} selectedId={selectedId ?? null} />
        {target && <TargetMarker placed={target} />}
      </svg>

      {popoverAnchor && (
        <div
          ref={popoverRef}
          aria-live="polite"
          data-placement="above"
          className="denah-popover absolute left-0 top-0 z-10 w-max max-w-[min(17rem,calc(100%-1rem))] rounded-xl border border-line/80 bg-white/97 py-2.5 pl-3.5 pr-10 shadow-(--shadow-lift) backdrop-blur-sm"
          style={{ visibility: "hidden" }}
        >
          {popover}
          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Tutup info makam</span>
            </button>
          )}
        </div>
      )}

      <div ref={controlsRef} className="absolute right-3 top-3 z-20 flex flex-col gap-2">
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
          {(target || selected) && (
            <MapButton label="Fokus ke makam" onClick={() => focusTarget(true)}>
              <Crosshair className="size-[18px]" />
            </MapButton>
          )}
        </div>
      </div>
    </div>
  );
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

/** Latar tanah + petak baris (jalan setapak di antaranya) agar susunan makam mudah dibaca. */
const Ground = memo(function Ground({ extent, size }: { extent: { columns: number; rows: number }; size: Size }) {
  const bedX = CELL.padding - 6;
  const bedWidth = extent.columns * CELL.width + 12;
  return (
    <g aria-hidden="true">
      <rect x={4} y={4} width={size.width - 8} height={size.height - 8} rx={20} fill={COLORS.land} stroke={COLORS.landStroke} strokeWidth={1.5} />
      {Array.from({ length: extent.rows }, (_, i) => (
        <rect
          key={i}
          x={bedX}
          y={cellOrigin(1, i + 1).y + 3}
          width={bedWidth}
          height={CELL.height - 6}
          rx={12}
          fill={COLORS.bed}
          opacity={0.7}
        />
      ))}
    </g>
  );
});

const Axis = memo(function Axis({ extent }: { extent: { columns: number; rows: number } }) {
  const step = extent.columns > 30 ? 5 : 1;
  const rowStep = extent.rows > 30 ? 5 : 1;
  return (
    <g fontSize={11} fontWeight={600} fill={COLORS.axis} textAnchor="middle" aria-hidden="true">
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
          rx={6}
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

/** Makam non-aktif abu-abu; tujuan hijau penuh, terpilih emas penuh. Memo agar pan/zoom tidak me-render ulang ratusan elemen. */
const GraveLayer = memo(function GraveLayer({
  placed,
  targetId,
  selectedId,
}: {
  placed: Placed[];
  targetId: string | null;
  selectedId: string | null;
}) {
  return (
    <g>
      {placed.map(({ grave, pos }) => {
        const o = cellOrigin(pos.x, pos.y);
        const isTarget = grave.id === targetId;
        const isSelected = !isTarget && grave.id === selectedId;
        const active = isTarget || isSelected;
        const x = o.x + GRAVE_OFFSET.x;
        const y = o.y + GRAVE_OFFSET.y;
        return (
          <g key={grave.id} data-grave-id={grave.id} className="denah-grave cursor-pointer">
            <title>{`${grave.deceased_name} — ${grave.grave_code}`}</title>
            {/* Bayangan ringan (tanpa filter SVG agar pan/zoom tetap ringan di HP). */}
            <path d={headstonePath(x + 1, y + 2.5, CELL.graveWidth, CELL.graveHeight)} fill="#15362d" opacity={active ? 0.18 : 0.08} />
            <path
              d={headstonePath(x, y, CELL.graveWidth, CELL.graveHeight)}
              fill={isTarget ? COLORS.target : isSelected ? COLORS.selected : COLORS.grave}
              stroke={isTarget ? COLORS.targetStroke : isSelected ? COLORS.selectedStroke : COLORS.graveStroke}
              strokeWidth={active ? 1.5 : 1}
              data-active={active || undefined}
              className="denah-stone"
            />
            <text
              x={x + CELL.graveWidth / 2}
              y={y + CELL.graveHeight / 2 + 6}
              textAnchor="middle"
              fontSize={11}
              fontWeight={active ? 700 : 600}
              fill={active ? "#ffffff" : COLORS.graveText}
              pointerEvents="none"
            >
              {grave.grave_number ?? "?"}
            </text>
          </g>
        );
      })}
    </g>
  );
});

function TargetMarker({ placed }: { placed: Placed }) {
  const c = cellCenter(placed.pos.x, placed.pos.y);
  return (
    <g pointerEvents="none" aria-hidden="true">
      <circle cx={c.x} cy={c.y} r={29} fill="none" stroke={COLORS.target} strokeWidth={2.5} className="pulse-ring" />
      <circle cx={c.x} cy={c.y} r={29} fill="none" stroke={COLORS.selected} strokeWidth={1.5} opacity={0.55} />
    </g>
  );
}

/** Sorotan lembut di bawah nisan aktif (digambar sebelum makam agar tidak menutupi tetangga). */
function Halo({ placed, color }: { placed: Placed; color: string }) {
  const c = cellCenter(placed.pos.x, placed.pos.y);
  return <circle cx={c.x} cy={c.y} r={29} fill={color} opacity={0.14} pointerEvents="none" aria-hidden="true" />;
}

function headstonePath(x: number, y: number, w: number, h: number) {
  const r = w / 2;
  const b = 3; // sudut bawah sedikit membulat
  return `M${x} ${y + h - b} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - b} Q${x + w} ${y + h} ${x + w - b} ${y + h} H${x + b} Q${x} ${y + h} ${x} ${y + h - b} Z`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
