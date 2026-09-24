# TPU Astana Pratiksha Cianjur — Web Assets V1

Paket ini berisi aset production-ready yang dapat langsung dipindahkan ke folder `public/` project Next.js.

## Struktur

- `public/assets/hero/` — cover landing page untuk desktop, tablet, dan mobile.
- `public/assets/headers/` — banner/header halaman publik.
- `public/assets/brand/` — logo horizontal, logo mark, favicon, dan app icon.
- `public/assets/placeholders/` — placeholder ketika foto makam tidak tersedia.
- `source-originals/` — file hasil generate asli beresolusi penuh untuk arsip/desain ulang.

## Aturan penggunaan

1. **Hero landing page**
   - Desktop: `hero-cover-desktop-1600x900.webp`
   - Tablet: `hero-cover-tablet-1200x800.webp`
   - Mobile: `hero-cover-mobile-900x1200.webp`
   Gunakan `<picture>`/responsive source atau Next.js `<Image>` sesuai breakpoint.

2. **Header halaman**
   - Desktop: `page-header-desktop-1920x640.webp`
   - Mobile: `page-header-mobile-900x600.webp`
   Cocok untuk Cari Makam, Detail Makam, Panduan, Tentang, dan halaman publik lain.

3. **Brand**
   - Utama: `logo-horizontal-1200x400.webp` atau `.png`
   - Icon/app mark: `logo-mark-512x512.png`
   - Favicon: `favicon.ico` / `favicon-32x32.png`
   - PWA/app icon: `app-icon-192x192.png`

4. **Foto makam opsional**
   Jika makam tidak mempunyai foto, gunakan `grave-photo-placeholder-512x512.webp` untuk web. Versi PNG 1024 disediakan untuk sumber berkualitas lebih tinggi.

5. **Performa**
   - Utamakan file `.webp` pada halaman web.
   - Jangan gunakan file dalam `source-originals/` langsung di production kecuali diperlukan.
   - Hero dan header sebaiknya menggunakan `priority` hanya pada gambar yang tampil di above-the-fold.
   - Foto makam pengguna tetap dikompresi client-side sebelum upload, terpisah dari aset ini.

## Catatan visual

Aset gambar suasana TPU merupakan visual ilustratif/dummy untuk tahap V1 dan referensi desain. Ganti dengan foto lokasi TPU Astana Pratiksha yang sebenarnya apabila dokumentasi resmi sudah tersedia.
