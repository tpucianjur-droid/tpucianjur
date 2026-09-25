# Sistem Aplikasi Pemakaman TPU Astana Pratiksha Cianjur

Aplikasi web responsif (HP, tablet, desktop) untuk mencari makam, membuka petunjuk arah ke TPU lewat Google Maps, dan melihat posisi makam pada denah internal Blok A–D. Admin mengelola data, verifikasi per field, denah, dan lokasi TPU.

**Stack:** Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 · Supabase **hosted** (PostgreSQL, Auth, Storage) melalui `@supabase/supabase-js` + `@supabase/ssr` · Vercel.
Tidak memakai Docker, Supabase lokal, Prisma/Drizzle, atau koneksi database langsung.

Dokumen acuan (source of truth): `01_Dokumen/`, `02_Referensi_Visual/`, `03_Data_Seed/`, `04_Developer_Assets/`, `README_ASSETS.md`.

---

## 1. Setup Supabase (online)

Cara utama: **Supabase CLI (project-scoped lewat `npx`) terhadap project HOSTED** — tanpa Docker, tanpa `supabase start`/`db pull`/`db reset`.

```bash
npx supabase login                                   # sekali, interaktif (browser)
npx supabase link --project-ref <PROJECT_REF>        # ref = subdomain di URL project
npx supabase db push --dry-run --include-seed        # audit: migration + seed yang akan diterapkan
npx supabase db push --include-seed                  # terapkan migration + seed 149 data Blok A
```

- Migration (`supabase/migrations`): schema baseline V1, constraint, trigger (kode makam otomatis, status verifikasi, audit log), tabel `admin_users`, RLS, view publik aman, RPC pencarian, bucket foto.
- Seed (`[db.seed]` di `supabase/config.toml`): 149 data Blok A (`ON CONFLICT DO NOTHING`, aman diulang) + simulasi grid denah Blok A. Hasil: `149` makam, `A-001`…`A-149`, `115` perlu verifikasi / `34` terverifikasi.
- `supabase/setup/VERIFY_SETUP.sql` berisi pemeriksaan pasca-setup (semua kolom `ok` harus `true`).

Lalu di Dashboard:

1. **Authentication → Sign In / Providers → Email**: pastikan **Allow new users to sign up** mati (akun Admin dibuat pengelola).
2. **Authentication → Users → Add user → Create new user**: isi email + password kuat, centang *Auto Confirm User*.
3. Daftarkan user tersebut ke `admin_users` (isi `supabase/setup/CREATE_ADMIN_USER.sql`). Hanya user di tabel `admin_users` yang dapat membuka `/admin`.

> Cadangan terakhir bila CLI tidak dapat dipakai: tempel `supabase/setup/SETUP_SUPABASE_ONLINE.sql` di **SQL Editor** (isi sama dengan migration + seed; dibuat ulang dengan `npm run db:setup-sql`). Jangan campur kedua cara pada project yang sama tanpa `supabase migration repair`.

## 2. Environment variables

Salin `.env.example` menjadi `.env.local`, lalu isi:

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ya | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ya | `sb_publishable_…` (atau isi `NEXT_PUBLIC_SUPABASE_ANON_KEY` untuk legacy anon key) |
| `NEXT_PUBLIC_SITE_URL` | tidak | URL production untuk metadata |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | tidak | Hanya untuk tes live: akun uji yang terdaftar di `admin_users` |
| `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` | tidak | Hanya untuk `test:security:live:write`: akun uji login yang **bukan** Admin |

Service-role key **tidak dibutuhkan** dan jangan pernah dimasukkan ke aplikasi/Vercel.

## 3. Menjalankan lokal

```bash
npm install
npm run dev          # http://localhost:3000
```

Tanpa `.env.local`, aplikasi tetap berjalan: halaman publik menampilkan pesan "Data belum dapat dimuat" dan halaman login menampilkan peringatan konfigurasi.

## 4. Deploy ke Vercel

1. Push repository ke GitHub/GitLab, lalu **Import Project** di Vercel (framework terdeteksi otomatis: Next.js).
2. **Settings → Environment Variables**: isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan (opsional) `NEXT_PUBLIC_SITE_URL` untuk Production & Preview.
3. **Settings → General → Node.js Version**: pilih **22.x** atau lebih baru (supabase-js menandai Node 20 sebagai deprecated).
4. Deploy. Setelah URL production diketahui, isi **Supabase → Authentication → URL Configuration → Site URL** dengan URL tersebut.

## 5. Perintah kualitas

```bash
npm run lint         # ESLint
npm run typecheck    # next typegen + tsc --noEmit
npm run test         # Vitest (unit, 91 tes)
npm run build        # production build
npm run test:e2e     # Playwright: build .next-e2e + fake Supabase in-memory (tanpa DB/Docker)
npm run test:e2e:live  # pemeriksaan READ-ONLY terhadap Supabase online (.env.local, setelah npm run build)
npm run test:e2e:live:write  # OPT-IN: alur Admin membuat/mengarsipkan data uji hosted
npm run test:security:live:write  # OPT-IN: audit RLS/Storage membuat lalu menghapus data uji hosted
```

`test:e2e` memakai `tests/e2e/fake-supabase.mjs` — server tiruan PostgREST/Auth/Storage berisi 149 data CSV (in-memory) sehingga alur publik & Admin dapat diuji di browser (desktop 1366px & Pixel 7). Storage tiruan selalu menolak upload untuk membuktikan data tetap tersimpan saat foto gagal. Instal browser sekali: `npx playwright install chromium`.

Perintah `npm run check`, `npm run test`, dan `npm run test:e2e` tidak membaca atau menulis Supabase hosted. Suite live yang melakukan write diblokir dengan dua guard (`ALLOW_LIVE_WRITE_TESTS=1` dan argumen konfirmasi) dan hanya dibuka oleh perintah bernama `*:live:write`; jangan jalankan tanpa permintaan eksplisit untuk menulis ke production.

## 6. Struktur

```
src/
  app/(public)/        Beranda, cari-makam, makam/[kode], makam/[kode]/lokasi, denah, panduan, tentang
  app/admin/login      Login Admin
  app/admin/(panel)/   Dashboard, makam (list + verifikasi/tambah/edit/export), denah, pengaturan
  app/api/cari         API pencarian publik (cache CDN 30 dtk)
  proxy.ts             Proteksi /admin (Next 16 "proxy" = middleware)
  components/          ui, public, denah (SVG pan/zoom), admin (form, editor denah, foto)
  lib/                 actions (server actions), data (query), graves, denah, photo, search, validation
supabase/
  migrations/          baseline V1 (verbatim) + keamanan/logika V1
  seed/                seed 149 data (verbatim dari 03_Data_Seed) + simulasi grid Blok A
  setup/               SQL siap tempel ke SQL Editor
tests/unit, tests/e2e
```

## 7. Catatan keamanan

- Publik hanya membaca view `public_graves` & RPC `search_public_graves` (dari ahli waris hanya nama; tanpa telepon/alamat). `anon` tidak punya privilege ke tabel `graves`.
- Semua tulis/baca data internal lewat RLS `is_admin()` (tabel `admin_users`), divalidasi ulang di server (Zod) dan dicatat otomatis ke `audit_logs` oleh trigger.
- Foto: dikompres di browser (WebP ≤1280px, target ≤250 KB), divalidasi ulang di server (signature byte, ≤1 MB), bucket dibatasi WebP/JPEG 1 MB.
