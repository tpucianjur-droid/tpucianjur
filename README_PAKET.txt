PAKET DOKUMEN V1 - SISTEM APLIKASI PEMAKAMAN TPU ASTANA PRATIKSHA CIANJUR

Isi folder:
01_Dokumen/
  01_PRD_TPU_Astana_Pratiksha_V1.docx
  02_SRS_dan_Acceptance_Criteria_V1.docx
  03_Arsitektur_Teknis_dan_Desain_Database_V1.docx
  04_Spesifikasi_UX_UI_dan_User_Flow_V1.docx
  05_Rencana_Implementasi_Testing_Operasional_V1.docx

02_Referensi_Visual/
  Mockup desktop + mobile hasil desain/generate sebelumnya.
  Buka 00_INDEX_VISUAL.html untuk melihat seluruh mockup secara berurutan.
  Catatan: gambar adalah referensi visual, bukan data/denah lapangan final.

03_Data_Seed/
  data_makam_149_blok_A_STAGING.csv
  data_verifikasi_tulisan_tangan_149.xlsx
  supabase_schema_v1.sql
  seed_149_blok_A_STAGING.sql

04_Developer_Assets/
  DEVELOPER_HANDOFF.md
  arsitektur_v1.svg

Keputusan penting:
- 149 data awal seluruhnya Blok A, kode simulasi A-001 s.d. A-149.
- Blok tersedia A-D; kapasitas dan denah final masih configurable/TBD.
- Field yang perlu verifikasi berwarna merah hanya pada Admin.
- Foto makam opsional, maksimum 1, dikompres client-side; data tetap jalan tanpa foto.
- Google Maps menuju satu titik TPU, lalu posisi internal memakai denah SVG.
- Lokasi V1: Tempat Kerja, 548F+PCC, Nagrak, Kec. Cianjur, Kabupaten Cianjur, Jawa Barat 43215.

Status: BASELINE V1 untuk mulai development/pilot. Data seed wajib tetap dapat diedit Admin.
