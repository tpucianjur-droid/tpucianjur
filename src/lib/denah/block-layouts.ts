/**
 * Layout denah per blok berbasis BARIS (data-driven). Nomor makam diisi berurutan per baris:
 * baris 1 memuat nomor 1..count, baris 2 melanjutkan, dst. Jumlah per baris boleh berbeda
 * (bidang tanah tidak rata) dan `offset` menggeser awal baris agar tepi blok tidak kaku.
 *
 * CARA MENGUBAH: cukup edit angka `count` / `offset` di BLOCK_LAYOUTS. Tidak ada koordinat visual
 * yang di-hard-code; posisi SVG dihitung dari config ini.
 *
 * Blok tanpa entri di sini = belum dipetakan (tidak dibuatkan layout palsu).
 */

/** known = data lapangan; ongoing = baris sedang terisi (kapasitas akhir belum diketahui); simulated = simulasi sementara. */
export type RowStatus = "known" | "ongoing" | "simulated";

export type RowSpec = { count: number; offset?: number; status?: RowStatus };

export type BlockLayoutConfig = {
  /** Rencana kapasitas blok (jumlah petak). */
  capacity: number;
  /** Nomor terakhir yang diketahui sudah terisi di lapangan (walau datanya belum tercatat di sistem). */
  filledThrough: number;
  rows: RowSpec[];
};

export type LayoutRow = { row: number; start: number; end: number; offset: number; status: RowStatus };

export type BlockLayout = {
  capacity: number;
  filledThrough: number;
  rows: LayoutRow[];
  /** Lebar blok dalam sel (offset + jumlah petak terpanjang). */
  columns: number;
};

export const BLOCK_LAYOUTS: Record<string, BlockLayoutConfig> = {
  A: {
    capacity: 1000,
    filledThrough: 163,
    rows: [
      { count: 21 }, // Baris 1: 001–021
      { count: 33 }, // Baris 2: 022–054
      { count: 33 }, // Baris 3: 055–087
      { count: 33 }, // Baris 4: 088–120
      { count: 33 }, // Baris 5: 121–153
      // Baris 6: 154–163 sudah terisi; BELUM selesai. Panjang akhir belum diketahui (33 = perkiraan sementara).
      { count: 33, status: "ongoing" },
      // Baris 7 dst.: SIMULASI sementara sampai kapasitas 1000. Ganti dengan data lapangan bila sudah diukur.
      { count: 35, offset: 1, status: "simulated" },
      { count: 34, status: "simulated" },
      { count: 36, offset: 2, status: "simulated" },
      { count: 33, offset: 1, status: "simulated" },
      { count: 35, status: "simulated" },
      { count: 37, offset: 2, status: "simulated" },
      { count: 34, offset: 3, status: "simulated" },
      { count: 36, offset: 1, status: "simulated" },
      { count: 32, status: "simulated" },
      { count: 35, offset: 2, status: "simulated" },
      { count: 38, offset: 1, status: "simulated" },
      { count: 34, status: "simulated" },
      { count: 36, offset: 3, status: "simulated" },
      { count: 33, offset: 1, status: "simulated" },
      { count: 35, offset: 2, status: "simulated" },
      { count: 37, status: "simulated" },
      { count: 34, offset: 1, status: "simulated" },
      { count: 36, offset: 2, status: "simulated" },
      { count: 35, status: "simulated" },
      { count: 33, offset: 1, status: "simulated" },
      { count: 36, offset: 2, status: "simulated" },
      { count: 34, offset: 3, status: "simulated" },
      { count: 30, offset: 4, status: "simulated" },
      { count: 16, offset: 9, status: "simulated" },
    ],
  },
};

export function buildBlockLayout(config: BlockLayoutConfig): BlockLayout {
  const rows: LayoutRow[] = [];
  let next = 1;
  let columns = 1;
  for (const [index, spec] of config.rows.entries()) {
    if (next > config.capacity) break;
    const count = Math.max(1, Math.floor(spec.count));
    const offset = Math.max(0, Math.floor(spec.offset ?? 0));
    const end = Math.min(next + count - 1, config.capacity);
    rows.push({ row: index + 1, start: next, end, offset, status: spec.status ?? "known" });
    columns = Math.max(columns, offset + end - next + 1);
    next = end + 1;
  }
  return { capacity: config.capacity, filledThrough: config.filledThrough, rows, columns };
}

const cache = new Map<string, BlockLayout>();

export function getBlockLayout(code: string | null | undefined): BlockLayout | null {
  if (!code) return null;
  const config = BLOCK_LAYOUTS[code];
  if (!config) return null;
  let layout = cache.get(code);
  if (!layout) {
    layout = buildBlockLayout(config);
    cache.set(code, layout);
  }
  return layout;
}

/** Posisi sel (x = kolom, y = baris; mulai 1) untuk nomor makam pada layout baris. */
export function layoutSlot(layout: BlockLayout, graveNumber: number | null | undefined): { x: number; y: number } | null {
  if (typeof graveNumber !== "number" || !Number.isInteger(graveNumber) || graveNumber < 1) return null;
  for (const row of layout.rows) {
    if (graveNumber >= row.start && graveNumber <= row.end) {
      return { x: row.offset + graveNumber - row.start + 1, y: row.row };
    }
  }
  return null;
}
