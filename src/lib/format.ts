const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** "2024-08-17" => "17 Agustus 2024". Tanggal kosong => fallback. */
export function formatDate(isoDate: string | null | undefined, fallback = "Belum tercatat"): string {
  if (!isoDate) return fallback;
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? fallback : DATE_FORMAT.format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : `${DATETIME_FORMAT.format(date)} WIB`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function padGraveNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const digits = String(value);
  return digits.length < 3 ? digits.padStart(3, "0") : digits;
}
