-- SIMULASI denah V1 (bukan denah lapangan final).
-- Blok A memakai grid 10 kolom x 15 baris agar A-001..A-149 dapat ditampilkan otomatis
-- berdasarkan nomor makam. Kapasitas tetap NULL (belum diketahui).
-- Semua nilai ini dapat diubah Admin melalui menu Denah Blok tanpa deploy ulang.
update public.blocks
set grid_columns = 10,
    grid_rows = 15
where code = 'A'
  and grid_columns is null
  and grid_rows is null;
