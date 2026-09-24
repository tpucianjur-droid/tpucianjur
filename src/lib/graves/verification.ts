/**
 * Verifikasi per field. Flag `verify_*` bernilai TRUE artinya field PERLU DICEK (tampil merah di Admin).
 * Mengikuti Desain Database V1 (AC-ADM-02: verify_heir_address=true => hanya alamat yang merah).
 */
export const VERIFY_FIELDS = [
  { key: "verify_deceased_name", label: "Nama yang dimakamkan", hint: "Perlu verifikasi ejaan nama" },
  { key: "verify_death_date", label: "Tanggal wafat", hint: "Perlu verifikasi tanggal wafat" },
  { key: "verify_heir_name", label: "Nama ahli waris", hint: "Perlu verifikasi nama ahli waris" },
  { key: "verify_heir_phone", label: "Telepon ahli waris", hint: "Perlu verifikasi nomor telepon" },
  { key: "verify_heir_address", label: "Alamat ahli waris", hint: "Alamat ahli waris perlu diverifikasi" },
  { key: "verify_location", label: "Lokasi (blok & nomor)", hint: "Perlu verifikasi blok dan nomor makam" },
] as const;

export type VerifyFieldKey = (typeof VERIFY_FIELDS)[number]["key"];
export type VerificationFlags = Record<VerifyFieldKey, boolean>;
export type VerificationStatus = "VERIFIED" | "NEEDS_VERIFICATION";

export const VERIFY_FIELD_KEYS: readonly VerifyFieldKey[] = VERIFY_FIELDS.map((f) => f.key);

export const ALL_VERIFIED: VerificationFlags = {
  verify_deceased_name: false,
  verify_death_date: false,
  verify_heir_name: false,
  verify_heir_phone: false,
  verify_heir_address: false,
  verify_location: false,
};

/** Record = NEEDS_VERIFICATION bila minimal satu field masih perlu dicek. */
export function computeVerificationStatus(flags: VerificationFlags): VerificationStatus {
  return VERIFY_FIELD_KEYS.some((key) => flags[key]) ? "NEEDS_VERIFICATION" : "VERIFIED";
}

export function flaggedFields(flags: VerificationFlags) {
  return VERIFY_FIELDS.filter((field) => flags[field.key]);
}

export function pickFlags(source: Partial<Record<VerifyFieldKey, boolean | null>>): VerificationFlags {
  const flags = { ...ALL_VERIFIED };
  for (const key of VERIFY_FIELD_KEYS) flags[key] = source[key] === true;
  return flags;
}

export function isVerifyFieldKey(value: string): value is VerifyFieldKey {
  return (VERIFY_FIELD_KEYS as readonly string[]).includes(value);
}

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  VERIFIED: "Terverifikasi",
  NEEDS_VERIFICATION: "Perlu Verifikasi",
};
