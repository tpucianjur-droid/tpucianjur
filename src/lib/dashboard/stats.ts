/** Agregasi murni untuk Dashboard Admin (tanpa akses database — mudah diuji). */

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type MonthPoint = { key: string; label: string; year: number; inserted: number; verified: number };

/** Kunci bulan "YYYY-MM" menurut waktu WIB (UTC+7, tanpa DST). */
export function monthKeyWib(iso: string | Date): string | null {
  const time = typeof iso === "string" ? Date.parse(iso) : iso.getTime();
  if (Number.isNaN(time)) return null;
  const local = new Date(time + JAKARTA_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Awal bulan (WIB) `months - 1` bulan sebelum bulan berjalan, sebagai ISO UTC — batas bawah query. */
export function rangeStartIso(now: Date, months = 12): string {
  const local = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (months - 1), 1) - JAKARTA_OFFSET_MS;
  return new Date(start).toISOString();
}

/** Deret bulanan (12 bulan terakhir, termasuk bulan berjalan): data dimasukkan vs data terverifikasi. */
export function buildMonthlySeries(now: Date, insertedAt: string[], verifiedAt: string[], months = 12): MonthPoint[] {
  const local = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i, 1));
    const month = date.getUTCMonth();
    points.push({
      key: `${date.getUTCFullYear()}-${String(month + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[month],
      year: date.getUTCFullYear(),
      inserted: 0,
      verified: 0,
    });
  }
  const index = new Map(points.map((point, i) => [point.key, i]));
  const add = (values: string[], field: "inserted" | "verified") => {
    for (const value of values) {
      const key = monthKeyWib(value);
      const i = key ? index.get(key) : undefined;
      if (i !== undefined) points[i][field] += 1;
    }
  };
  add(insertedAt, "inserted");
  add(verifiedAt, "verified");
  return points;
}

export type ActivityKind = "create" | "verify" | "archive" | "restore" | "update" | "delete";

export type ActivitySource = {
  action: string;
  before_status: string | null;
  after_status: string | null;
  before_archived: string | null;
  after_archived: string | null;
};

/** Jenis aktivitas dari satu baris audit log tabel graves. */
export function classifyActivity(row: ActivitySource): ActivityKind {
  if (row.action === "INSERT") return "create";
  if (row.action === "DELETE") return "delete";
  if (!row.before_archived && row.after_archived) return "archive";
  if (row.before_archived && !row.after_archived) return "restore";
  if (row.after_status === "VERIFIED" && row.before_status !== "VERIFIED") return "verify";
  return "update";
}

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  create: "Tambah data makam",
  verify: "Verifikasi data",
  archive: "Arsipkan data",
  restore: "Pulihkan dari arsip",
  update: "Ubah data makam",
  delete: "Hapus data makam",
};

/** Persentase satu desimal (0 bila total 0). */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

/** Batas atas sumbu Y yang "bulat" (1, 2, 2.5, 5 × 10^n) dengan jumlah interval tetap. */
export function niceAxis(max: number, intervals = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) {
    return { max: intervals, ticks: Array.from({ length: intervals + 1 }, (_, i) => i) };
  }
  const raw = max / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw && Number.isInteger(s)) ?? Math.ceil(raw);
  const top = step * intervals;
  return { max: top, ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step) };
}
