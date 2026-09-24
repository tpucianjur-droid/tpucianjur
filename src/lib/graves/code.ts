/**
 * Kode makam = KODE BLOK + "-" + nomor (minimal 3 digit). Contoh: A + 32 => "A-032".
 * Logika yang sama dijalankan di database (public.format_grave_code) sebagai sumber kebenaran.
 */
export function formatGraveCode(blockCode: string, graveNumber: number): string {
  const block = blockCode.trim().toUpperCase();
  const digits = String(Math.trunc(graveNumber));
  return `${block}-${digits.length < 3 ? digits.padStart(3, "0") : digits}`;
}

const CODE_PATTERN = /^\s*([A-Za-z]{1,3})\s*[-\s]?\s*0*(\d{1,5})\s*$/;

/**
 * Mengenali input yang berupa kode makam ("A-032", "a32", "A 032").
 * Mengembalikan kode kanonik atau null bila bukan kode.
 */
export function parseGraveCode(input: string): string | null {
  const match = CODE_PATTERN.exec(input);
  if (!match) return null;
  const number = Number(match[2]);
  if (!Number.isInteger(number) || number < 1) return null;
  return formatGraveCode(match[1], number);
}

/** Normalisasi parameter URL kode makam, mis. "a-032" => "A-032". */
export function normalizeGraveCodeParam(raw: string): string | null {
  return parseGraveCode(safeDecode(raw));
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
