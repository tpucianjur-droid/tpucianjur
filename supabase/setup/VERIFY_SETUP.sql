-- =====================================================================
-- Pemeriksaan pasca-setup (jalankan di SQL Editor). Semua baris "ok" harus bernilai true.
-- =====================================================================
with checks as (
  select 'seed 149 makam' as cek, (select count(*) from public.graves) = 149 as ok
  union all
  select 'semua di Blok A', not exists (
    select 1 from public.graves g join public.blocks b on b.id = g.block_id where b.code <> 'A')
  union all
  select 'kode A-001..A-149 lengkap', (
    select count(*) from generate_series(1, 149) n
    where exists (select 1 from public.graves g where g.grave_code = 'A-' || lpad(n::text, 3, '0'))) = 149
  union all
  select 'blok A-D tersedia', (select count(*) from public.blocks where code in ('A','B','C','D')) = 4
  union all
  select 'status verifikasi konsisten', not exists (
    select 1 from public.graves where verification_status <> case
      when verify_deceased_name or verify_death_date or verify_heir_name or verify_heir_phone
        or verify_heir_address or verify_location then 'NEEDS_VERIFICATION' else 'VERIFIED' end)
  union all
  select '115 perlu verifikasi / 34 terverifikasi (sesuai staging)', (
    select count(*) filter (where verification_status = 'NEEDS_VERIFICATION') = 115
       and count(*) filter (where verification_status = 'VERIFIED') = 34 from public.graves)
  union all
  select 'RLS aktif di graves', (select relrowsecurity from pg_class where oid = 'public.graves'::regclass)
  union all
  select 'anon tidak punya SELECT di graves', not has_table_privilege('anon', 'public.graves', 'select')
  union all
  select 'view publik tanpa telepon/alamat ahli waris', not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'public_graves' and column_name in ('heir_phone', 'heir_address'))
  union all
  select 'bucket grave-photos ada', exists (select 1 from storage.buckets where id = 'grave-photos')
  union all
  select 'lokasi Google Maps terisi', exists (select 1 from public.cemeteries where coalesce(google_maps_query, google_maps_url) is not null)
)
select * from checks;

-- Uji pencarian publik (partial, case-insensitive):
select grave_code, deceased_name from public.search_public_graves('rita');
select grave_code, deceased_name from public.search_public_graves('sopandi');
