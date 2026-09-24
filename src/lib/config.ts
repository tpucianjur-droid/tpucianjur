/** Konstanta aplikasi. Data yang dapat berubah di lapangan (lokasi, blok, grid) disimpan di database, bukan di sini. */
export const APP = {
  name: "Sistem Aplikasi Pemakaman TPU Astana Pratiksha Cianjur",
  shortName: "TPU Astana Pratiksha",
  subtitle: "Cianjur",
  tagline: "Mempermudah pencarian makam dan menemukan lokasi dengan lebih cepat, akurat, dan mudah.",
  version: "1.0.0",
} as const;

/** Alamat & titik Google Maps bawaan TPU (dipakai bila pengaturan lokasi di database belum diisi). */
export const TPU_ADDRESS = "Tempat Kerja, 548F+PCC, Nagrak, Kec. Cianjur, Kabupaten Cianjur, Jawa Barat 43215";

export const SEARCH = {
  minChars: 2,
  maxChars: 100,
  debounceMs: 300,
  publicPageSize: 20,
  /** Cache CDN untuk respons pencarian publik (detik). */
  cdnMaxAgeSeconds: 30,
} as const;

export const ADMIN = {
  pageSize: 20,
} as const;

export const PHOTO = {
  bucket: "grave-photos",
  maxDimension: 1280,
  targetMaxBytes: 250 * 1024,
  /** Batas keras di server (sama dengan batas bucket). */
  hardMaxBytes: 1024 * 1024,
  /** Batas file mentah yang boleh dipilih sebelum dikompres. */
  maxInputBytes: 25 * 1024 * 1024,
  allowedUploadTypes: ["image/webp", "image/jpeg"] as const,
} as const;

export const CACHE_TAGS = {
  settings: "settings",
  blocks: "blocks",
} as const;

export const MESSAGES = {
  loadFailed: "Data belum dapat dimuat. Coba lagi.",
  notFound: "Makam tidak ditemukan.",
  noPhoto: "Foto makam belum tersedia",
  photoUploadFailed: "Foto gagal diunggah. Data makam tetap berhasil disimpan.",
  mapNotSet: "Posisi denah belum ditetapkan",
  mapsNotConfigured: "Lokasi Google Maps belum dikonfigurasi.",
  genericError: "Terjadi kesalahan. Silakan coba lagi.",
  denahDisclaimer:
    "Denah ini adalah gambaran posisi (simulasi) dan dapat disesuaikan dengan kondisi lapangan. Gunakan kode makam sebagai patokan utama.",
} as const;
