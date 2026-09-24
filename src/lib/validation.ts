import { z } from "zod";
import { VERIFY_FIELD_KEYS, type VerifyFieldKey } from "@/lib/graves/verification";

/** Bersihkan karakter kontrol & spasi berlebih. Output tetap di-escape React saat dirender. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

function cleanInline(value: unknown): string {
  return cleanText(value).replace(/\s+/g, " ");
}

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => {
      const text = cleanInline(v);
      return text === "" ? null : text;
    },
    z.string().max(max, `${label} terlalu panjang (maksimal ${max} karakter).`).nullable(),
  );

const optionalInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z
      .number({ error: `${label} harus berupa angka.` })
      .int(`${label} harus berupa bilangan bulat.`)
      .min(min, `${label} minimal ${min}.`)
      .max(max, `${label} maksimal ${max}.`)
      .nullable(),
  );

const optionalDecimal = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
    z
      .number({ error: `${label} harus berupa angka.` })
      .min(min, `${label} minimal ${min}.`)
      .max(max, `${label} maksimal ${max}.`)
      .nullable(),
  );

const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true" || v === "1", z.boolean());

const isoDate = z.preprocess(
  (v) => {
    const text = cleanText(v);
    return text === "" ? null : text;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    }, "Tanggal tidak valid.")
    .refine((value) => value >= "1800-01-01", "Tahun terlalu lama. Periksa kembali tanggal.")
    .refine((value) => value <= todayIso(), "Tanggal wafat tidak boleh di masa depan.")
    .nullable(),
);

const phone = z.preprocess(
  (v) => {
    const text = cleanInline(v);
    return text === "" ? null : text;
  },
  z
    .string()
    .max(30, "Nomor telepon terlalu panjang.")
    .regex(/^[0-9+()\-\s.]+$/, "Nomor telepon hanya boleh berisi angka, spasi, +, -, atau tanda kurung.")
    .refine((value) => value.replace(/\D/g, "").length >= 6, "Nomor telepon terlalu pendek.")
    .nullable(),
);

const verifyFlags = Object.fromEntries(VERIFY_FIELD_KEYS.map((key) => [key, checkbox])) as Record<
  VerifyFieldKey,
  typeof checkbox
>;

export const graveFormSchema = z
  .object({
    deceased_name: z.preprocess(
      cleanInline,
      z.string().min(1, "Nama yang dimakamkan wajib diisi.").max(200, "Nama terlalu panjang (maksimal 200 karakter)."),
    ),
    death_date: isoDate,
    date_semantics: z.enum(["WAFAT", "BELUM_DIPASTIKAN"], { error: "Pilih arti tanggal." }),
    heir_name: optionalText(200, "Nama ahli waris"),
    heir_phone: phone,
    heir_address: optionalText(500, "Alamat ahli waris"),
    block_id: z.uuid({ error: "Pilih blok makam." }),
    grave_number: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z
        .number({ error: "Nomor makam wajib diisi dengan angka." })
        .int("Nomor makam harus bilangan bulat.")
        .min(1, "Nomor makam minimal 1.")
        .max(99999, "Nomor makam maksimal 99999."),
    ),
    visual_row: optionalInt(1, 500, "Baris"),
    visual_column: optionalInt(1, 500, "Kolom"),
    visual_x: optionalDecimal(0, 1000, "Posisi X"),
    visual_y: optionalDecimal(0, 1000, "Posisi Y"),
    is_public: checkbox,
    transcription_notes: z.preprocess(
      (v) => {
        const text = cleanText(v);
        return text === "" ? null : text;
      },
      z.string().max(1000, "Catatan terlalu panjang (maksimal 1000 karakter).").nullable(),
    ),
    ...verifyFlags,
  })
  .superRefine((data, ctx) => {
    if ((data.visual_row === null) !== (data.visual_column === null)) {
      ctx.addIssue({
        code: "custom",
        path: [data.visual_row === null ? "visual_row" : "visual_column"],
        message: "Isi baris dan kolom bersamaan, atau kosongkan keduanya.",
      });
    }
    if ((data.visual_x === null) !== (data.visual_y === null)) {
      ctx.addIssue({
        code: "custom",
        path: [data.visual_x === null ? "visual_x" : "visual_y"],
        message: "Isi posisi X dan Y bersamaan, atau kosongkan keduanya.",
      });
    }
  });

export type GraveFormValues = z.infer<typeof graveFormSchema>;

export const blockFormSchema = z.object({
  code: z.preprocess(
    (v) => cleanInline(v).toUpperCase(),
    z.string().regex(/^[A-Z]{1,3}$/, "Kode blok berupa 1–3 huruf, mis. A atau E."),
  ),
  name: z.preprocess(cleanInline, z.string().min(1, "Nama blok wajib diisi.").max(60, "Nama blok terlalu panjang.")),
  capacity: optionalInt(1, 100000, "Kapasitas"),
  grid_rows: optionalInt(1, 500, "Jumlah baris"),
  grid_columns: optionalInt(1, 500, "Jumlah kolom"),
  sort_order: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number({ error: "Urutan harus angka." }).int().min(0).max(999),
  ),
  is_active: checkbox,
});

export type BlockFormValues = z.infer<typeof blockFormSchema>;

export const settingsFormSchema = z.object({
  name: z.preprocess(cleanInline, z.string().min(3, "Nama TPU wajib diisi.").max(120, "Nama TPU terlalu panjang.")),
  address: optionalText(300, "Alamat"),
  google_maps_query: optionalText(300, "Query Google Maps"),
  google_maps_url: z.preprocess(
    (v) => {
      const text = cleanInline(v);
      return text === "" ? null : text;
    },
    z
      .url({ protocol: /^https?$/, error: "Link Google Maps harus diawali https://" })
      .max(1000, "Link terlalu panjang.")
      .nullable(),
  ),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const positionSchema = z
  .object({
    grave_id: z.uuid(),
    visual_row: optionalInt(1, 500, "Baris"),
    visual_column: optionalInt(1, 500, "Kolom"),
    visual_x: optionalDecimal(0, 1000, "Posisi X"),
    visual_y: optionalDecimal(0, 1000, "Posisi Y"),
  })
  .refine((d) => (d.visual_row === null) === (d.visual_column === null), {
    message: "Isi baris dan kolom bersamaan.",
    path: ["visual_row"],
  })
  .refine((d) => (d.visual_x === null) === (d.visual_y === null), {
    message: "Isi posisi X dan Y bersamaan.",
    path: ["visual_x"],
  });

export type FieldErrors = Partial<Record<string, string>>;

/** Ambil pesan error pertama per field untuk ditampilkan di bawah input. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

export function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const object: Record<string, FormDataEntryValue> = {};
  formData.forEach((value, key) => {
    if (!key.startsWith("$ACTION")) object[key] = value;
  });
  return object;
}

function todayIso(): string {
  // Toleransi zona waktu WIB (UTC+7): gunakan tanggal "besok" UTC sebagai batas aman.
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
