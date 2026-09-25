-- =====================================================================
-- Nama ahli waris tampil di hasil pencarian publik (revisi UI kartu hasil).
-- HANYA heir_name yang dibuka ke publik; heir_phone, heir_address, dan
-- catatan internal tetap tidak ada di view maupun RPC.
-- =====================================================================

-- View publik: kolom baru ditambahkan di akhir agar create or replace valid.
create or replace view public.public_graves with (security_barrier = true) as
select
  g.id,
  g.grave_code,
  g.deceased_name,
  g.death_date,
  b.code as block_code,
  b.name as block_name,
  g.grave_number,
  g.visual_x,
  g.visual_y,
  g.visual_row,
  g.visual_column,
  g.photo_path,
  g.heir_name
from public.graves g
left join public.blocks b on b.id = g.block_id
where g.is_public = true
  and g.archived_at is null;

revoke all on public.public_graves from anon, authenticated;
grant select on public.public_graves to anon, authenticated;

-- Tipe kembalian berubah -> fungsi harus di-drop dulu. Logika pencarian tidak berubah.
drop function if exists public.search_public_graves(text, text, text, integer, integer);
create or replace function public.search_public_graves(
  p_query text,
  p_block text default null,
  p_code text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  grave_code text,
  deceased_name text,
  death_date date,
  block_code text,
  grave_number integer,
  heir_name text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')) as term
  ),
  pattern as (
    select term, replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') as esc
    from params
  )
  select
    g.id, g.grave_code, g.deceased_name, g.death_date, g.block_code, g.grave_number, g.heir_name,
    count(*) over () as total_count
  from public.public_graves g
  cross join pattern p
  where length(p.term) >= 2
    and (
      g.deceased_name ilike '%' || p.esc || '%'
      or (p_code is not null and g.grave_code = p_code)
    )
    and (p_block is null or g.block_code = p_block)
  order by
    case
      when p_code is not null and g.grave_code = p_code then 0
      when lower(g.deceased_name) = lower(p.term) then 1
      when g.deceased_name ilike p.esc || '%' then 2
      when g.deceased_name ilike '% ' || p.esc || '%' then 3
      else 4
    end,
    g.deceased_name,
    g.grave_code
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_public_graves(text, text, text, integer, integer) from public;
grant execute on function public.search_public_graves(text, text, text, integer, integer) to anon, authenticated;
