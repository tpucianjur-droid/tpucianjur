import { getBlockLayout, layoutSlot } from "./block-layouts";

/**
 * Posisi makam di denah internal (koordinat "sel", 1 = satu petak makam).
 * Prioritas sumber posisi:
 *   1. visual_x / visual_y  -> posisi bebas (boleh pecahan), untuk menyesuaikan kondisi lapangan
 *   2. visual_row / visual_column -> posisi grid yang diatur Admin
 *   3. layout baris blok (lib/denah/block-layouts) bila blok punya konfigurasi baris
 *   4. otomatis dari nomor makam bila blok punya konfigurasi grid_columns (simulasi V1)
 * Tidak ada kapasitas/ukuran yang di-hard-code: semuanya dari data blok, config layout & makam.
 */
export type PositionSource = "free" | "grid" | "layout" | "auto";

export type GravePositionInput = {
  grave_number: number | null;
  visual_x: number | null;
  visual_y: number | null;
  visual_row: number | null;
  visual_column: number | null;
};

export type BlockGridInput = {
  grid_rows: number | null;
  grid_columns: number | null;
  /** Kode blok, untuk mencari layout baris (opsional). */
  code?: string | null;
};

export type ResolvedPosition = { x: number; y: number; source: PositionSource };

export function resolvePosition(grave: GravePositionInput, block: BlockGridInput): ResolvedPosition | null {
  if (isNum(grave.visual_x) && isNum(grave.visual_y)) {
    return { x: grave.visual_x, y: grave.visual_y, source: "free" };
  }
  if (isNum(grave.visual_row) && isNum(grave.visual_column)) {
    return { x: grave.visual_column, y: grave.visual_row, source: "grid" };
  }
  const layout = getBlockLayout(block.code);
  if (layout) {
    // Blok dengan layout baris tidak memakai grid otomatis (nomor di luar kapasitas = belum punya posisi).
    const slot = layoutSlot(layout, grave.grave_number);
    return slot ? { ...slot, source: "layout" } : null;
  }
  const columns = block.grid_columns;
  if (isNum(columns) && columns > 0 && isNum(grave.grave_number) && grave.grave_number > 0) {
    const index = grave.grave_number - 1;
    return { x: (index % columns) + 1, y: Math.floor(index / columns) + 1, source: "auto" };
  }
  return null;
}

/** Ukuran kanvas blok (dalam sel) = maksimum dari konfigurasi grid/layout dan posisi makam terjauh. */
export function blockExtent(positions: ReadonlyArray<ResolvedPosition>, block: BlockGridInput) {
  const layout = getBlockLayout(block.code);
  let columns = layout ? layout.columns : (block.grid_columns ?? 0);
  let rows = layout ? layout.rows.length : (block.grid_rows ?? 0);
  for (const p of positions) {
    columns = Math.max(columns, Math.ceil(p.x));
    rows = Math.max(rows, Math.ceil(p.y));
  }
  return { columns: Math.max(columns, 1), rows: Math.max(rows, 1) };
}

/** Geometri SVG (unit viewBox). */
export const CELL = { width: 44, height: 60, graveWidth: 32, graveHeight: 46, padding: 36 } as const;

export function cellOrigin(x: number, y: number) {
  return {
    x: CELL.padding + (x - 1) * CELL.width,
    y: CELL.padding + (y - 1) * CELL.height,
  };
}

export function cellCenter(x: number, y: number) {
  const origin = cellOrigin(x, y);
  return { x: origin.x + CELL.width / 2, y: origin.y + CELL.height / 2 };
}

/** `extraRight` = ruang tambahan di kanan (mis. label rentang nomor per baris). */
export function canvasSize(extent: { columns: number; rows: number }, extraRight = 0) {
  return {
    width: CELL.padding * 2 + extent.columns * CELL.width + extraRight,
    height: CELL.padding * 2 + extent.rows * CELL.height,
  };
}

/** Kunci sel untuk mendeteksi dua makam di petak yang sama. */
export function cellKey(p: { x: number; y: number }) {
  return `${Math.round(p.x * 100)}:${Math.round(p.y * 100)}`;
}

function isNum(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
