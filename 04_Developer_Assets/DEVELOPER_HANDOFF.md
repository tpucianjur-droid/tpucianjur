# Developer Handoff - TPU Astana Pratiksha Cianjur

## Baseline
- Responsive Web: Next.js + TypeScript + Tailwind CSS
- Database/Auth/Storage: Supabase
- Hosting: Vercel
- Public navigation: Google Maps external link
- Internal map: SVG + configurable coordinates
- Initial data: 149 graves, all Block A, codes A-001..A-149
- Blocks: A, B, C, D; capacity TBD/configurable
- Photo: optional, max 1/grave, client-side compressed; upload failure must not block core save

## Public routes
`/`, `/cari-makam`, `/makam/[kode]`, `/makam/[kode]/lokasi`, `/panduan`, `/tentang`

## Admin routes
`/admin/login`, `/admin`, `/admin/makam`, `/admin/makam/tambah`, `/admin/makam/[id]/edit`, `/admin/denah`, `/admin/pengaturan`
(`/admin/verifikasi` lama → redirect permanen ke `/admin/makam?status=needs_verification`; verifikasi ada di Data Makam)

## Map location
Tempat Kerja, 548F+PCC, Nagrak, Kec. Cianjur, Kabupaten Cianjur, Jawa Barat 43215

## Critical rules
1. Never expose heir name/phone/address through public endpoint.
2. Verification is per-field. Red only in Admin; normal values have no special color.
3. Search must be partial-name friendly and indexed.
4. Denah must be configurable; do not hard-code real capacity.
5. Photo is optional and isolated from core data transaction.
6. Data seed is STAGING and expected to be corrected by Admin.
