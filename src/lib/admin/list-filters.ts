/** Utilitas URL daftar Data Makam (dipakai server & klien, tanpa akses database). */

export type ListStatus = "all" | "needs_verification" | "verified" | "archived";

export const LIST_STATUS_OPTIONS: { value: ListStatus; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "needs_verification", label: "Perlu Verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "archived", label: "Arsip" },
];

/** URL daftar dengan parameter yang terisi saja; page=1 tidak ditulis. */
export function buildListHref(base: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "" && !(key === "page" && value === 1)) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export type StatusTab = { value: ListStatus; label: string; href: string; active: boolean };

/**
 * Tombol filter status: kata kunci & blok dipertahankan, halaman kembali ke 1,
 * filter "field yang perlu dicek" dilepas (hanya berlaku di Perlu Verifikasi).
 */
export function buildStatusTabs(base: string, current: { q: string; block: string | null; status: ListStatus }): StatusTab[] {
  return LIST_STATUS_OPTIONS.map((option) => ({
    ...option,
    href: buildListHref(base, { q: current.q, blok: current.block, status: option.value === "all" ? null : option.value }),
    active: current.status === option.value,
  }));
}
