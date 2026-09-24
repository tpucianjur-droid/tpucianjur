-- V1: constraints, triggers, otorisasi Admin, RLS, view publik aman, RPC pencarian, storage foto.
-- Dibangun di atas baseline 20260924000001 (tidak mengubah kolom yang sudah ada).

-- =====================================================================
-- 1. Kolom tambahan
-- =====================================================================
alter table public.blocks
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Arsip (soft delete). Data tidak pernah hilang karena salah klik.
alter table public.graves
  add column if not exists archived_at timestamptz;

-- =====================================================================
-- 2. Constraints
-- =====================================================================
alter table public.blocks
  drop constraint if exists blocks_code_format,
  drop constraint if exists blocks_name_not_blank,
  drop constraint if exists blocks_capacity_positive,
  drop constraint if exists blocks_grid_rows_range,
  drop constraint if exists blocks_grid_columns_range;

alter table public.blocks
  add constraint blocks_code_format check (code ~ '^[A-Z]{1,3}$'),
  add constraint blocks_name_not_blank check (length(btrim(name)) between 1 and 60),
  add constraint blocks_capacity_positive check (capacity is null or capacity > 0),
  add constraint blocks_grid_rows_range check (grid_rows is null or grid_rows between 1 and 500),
  add constraint blocks_grid_columns_range check (grid_columns is null or grid_columns between 1 and 500);

alter table public.graves
  drop constraint if exists graves_verification_status_valid,
  drop constraint if exists graves_date_semantics_valid,
  drop constraint if exists graves_deceased_name_length,
  drop constraint if exists graves_grave_number_positive,
  drop constraint if exists graves_visual_row_positive,
  drop constraint if exists graves_visual_column_positive,
  drop constraint if exists graves_visual_x_range,
  drop constraint if exists graves_visual_y_range;

alter table public.graves
  add constraint graves_verification_status_valid
    check (verification_status in ('VERIFIED', 'NEEDS_VERIFICATION')),
  add constraint graves_date_semantics_valid
    check (date_semantics in ('WAFAT', 'BELUM_DIPASTIKAN')),
  add constraint graves_deceased_name_length check (length(btrim(deceased_name)) between 1 and 200),
  add constraint graves_grave_number_positive check (grave_number is null or grave_number between 1 and 99999),
  add constraint graves_visual_row_positive check (visual_row is null or visual_row between 1 and 500),
  add constraint graves_visual_column_positive check (visual_column is null or visual_column between 1 and 500),
  add constraint graves_visual_x_range check (visual_x is null or visual_x between 0 and 1000),
  add constraint graves_visual_y_range check (visual_y is null or visual_y between 0 and 1000);

-- Nomor makam tidak boleh dobel dalam blok yang sama.
drop index if exists public.idx_graves_block_number;
create unique index if not exists uq_graves_block_number
  on public.graves (block_id, grave_number)
  where block_id is not null and grave_number is not null;

-- Pencarian kode makam parsial (mis. "A-03").
create index if not exists idx_graves_code_trgm on public.graves using gin (grave_code gin_trgm_ops);
create index if not exists idx_graves_archived on public.graves (archived_at);

-- =====================================================================
-- 3. Kode makam & status verifikasi dihitung di database (satu sumber kebenaran)
-- =====================================================================
create or replace function public.format_grave_code(p_block_code text, p_number integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_block_code || '-' || case when p_number < 1000 then lpad(p_number::text, 3, '0') else p_number::text end;
$$;

create or replace function public.tg_graves_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_block_code text;
begin
  new.deceased_name := btrim(regexp_replace(new.deceased_name, '\s+', ' ', 'g'));

  if new.block_id is not null and new.grave_number is not null then
    select b.code into v_block_code from public.blocks b where b.id = new.block_id;
    if v_block_code is not null then
      new.grave_code := public.format_grave_code(v_block_code, new.grave_number);
    end if;
  end if;

  new.verification_status := case
    when new.verify_deceased_name or new.verify_death_date or new.verify_heir_name
      or new.verify_heir_phone or new.verify_heir_address or new.verify_location
    then 'NEEDS_VERIFICATION'
    else 'VERIFIED'
  end;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists graves_before_write on public.graves;
create trigger graves_before_write
  before insert or update on public.graves
  for each row execute function public.tg_graves_before_write();

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blocks_set_updated_at on public.blocks;
create trigger blocks_set_updated_at before update on public.blocks
  for each row execute function public.tg_set_updated_at();
drop trigger if exists cemeteries_set_updated_at on public.cemeteries;
create trigger cemeteries_set_updated_at before update on public.cemeteries
  for each row execute function public.tg_set_updated_at();

-- Jika kode blok diganti, kode makam di blok tersebut ikut diperbarui.
create or replace function public.tg_blocks_code_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    update public.graves set grave_number = grave_number where block_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists blocks_code_changed on public.blocks;
create trigger blocks_code_changed after update of code on public.blocks
  for each row execute function public.tg_blocks_code_changed();

-- =====================================================================
-- 4. Audit log otomatis (actor = auth.uid() dari JWT Admin)
-- =====================================================================
create or replace function public.tg_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_id := new.id;
    if (v_before - 'updated_at') = (v_after - 'updated_at') then
      return new;
    end if;
  else
    v_before := to_jsonb(old);
    v_id := old.id;
  end if;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, before_data, after_data)
  values (auth.uid(), tg_table_name, v_id, tg_op, v_before, v_after);

  return coalesce(new, old);
end;
$$;

drop trigger if exists graves_audit on public.graves;
create trigger graves_audit after insert or update or delete on public.graves
  for each row execute function public.tg_audit();
drop trigger if exists blocks_audit on public.blocks;
create trigger blocks_audit after insert or update or delete on public.blocks
  for each row execute function public.tg_audit();
drop trigger if exists cemeteries_audit on public.cemeteries;
create trigger cemeteries_audit after insert or update or delete on public.cemeteries
  for each row execute function public.tg_audit();

create index if not exists idx_audit_entity on public.audit_logs (entity_type, entity_id, created_at desc);

-- =====================================================================
-- 5. Akun Admin/Operator
--    Signup publik dimatikan; hanya user yang terdaftar di admin_users yang dianggap Admin.
-- =====================================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- =====================================================================
-- 6. Row Level Security
-- =====================================================================
alter table public.cemeteries enable row level security;
alter table public.blocks enable row level security;
alter table public.graves enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_users enable row level security;

-- cemeteries: konfigurasi publik (nama, alamat, lokasi Maps) boleh dibaca semua orang.
drop policy if exists cemeteries_read on public.cemeteries;
create policy cemeteries_read on public.cemeteries
  for select to anon, authenticated using (true);
drop policy if exists cemeteries_admin_insert on public.cemeteries;
create policy cemeteries_admin_insert on public.cemeteries
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists cemeteries_admin_update on public.cemeteries;
create policy cemeteries_admin_update on public.cemeteries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- blocks: publik hanya blok aktif; Admin semua.
drop policy if exists blocks_read on public.blocks;
create policy blocks_read on public.blocks
  for select to anon, authenticated using (is_active or (select public.is_admin()));
drop policy if exists blocks_admin_insert on public.blocks;
create policy blocks_admin_insert on public.blocks
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists blocks_admin_update on public.blocks;
create policy blocks_admin_update on public.blocks
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists blocks_admin_delete on public.blocks;
create policy blocks_admin_delete on public.blocks
  for delete to authenticated using ((select public.is_admin()));

-- graves: TIDAK ADA akses langsung untuk publik. Publik hanya lewat view public_graves.
drop policy if exists graves_admin_select on public.graves;
create policy graves_admin_select on public.graves
  for select to authenticated using ((select public.is_admin()));
drop policy if exists graves_admin_insert on public.graves;
create policy graves_admin_insert on public.graves
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists graves_admin_update on public.graves;
create policy graves_admin_update on public.graves
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists graves_admin_delete on public.graves;
create policy graves_admin_delete on public.graves
  for delete to authenticated using ((select public.is_admin()));

-- audit_logs: hanya dibaca Admin; ditulis oleh trigger (security definer).
drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select to authenticated using ((select public.is_admin()));

-- admin_users: Admin dapat melihat daftar Admin (untuk nama di riwayat perubahan).
drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Pertahanan berlapis di level privilege (selain RLS).
revoke all on public.graves from anon;
revoke all on public.audit_logs from anon;
revoke all on public.admin_users from anon;
revoke insert, update, delete, truncate on public.cemeteries, public.blocks from anon;
revoke insert, update, delete, truncate on public.audit_logs, public.admin_users from authenticated;

-- =====================================================================
-- 7. View publik aman: TANPA heir_name / heir_phone / heir_address / catatan internal
--    Berjalan dengan hak pemilik view sehingga publik tidak perlu akses ke tabel graves.
-- =====================================================================
drop view if exists public.public_graves;
create view public.public_graves with (security_barrier = true) as
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
  g.photo_path
from public.graves g
left join public.blocks b on b.id = g.block_id
where g.is_public = true
  and g.archived_at is null;

revoke all on public.public_graves from anon, authenticated;
grant select on public.public_graves to anon, authenticated;

-- Statistik per blok untuk dashboard Admin (mengikuti RLS pemanggil).
drop view if exists public.block_grave_counts;
create view public.block_grave_counts with (security_invoker = true) as
select
  b.id as block_id,
  b.code,
  count(g.id) filter (where g.archived_at is null) as total,
  count(g.id) filter (where g.archived_at is null and g.verification_status = 'NEEDS_VERIFICATION') as needs_verification
from public.blocks b
left join public.graves g on g.block_id = b.id
group by b.id, b.code;

revoke all on public.block_grave_counts from anon, authenticated;
grant select on public.block_grave_counts to authenticated;

-- =====================================================================
-- 8. Pencarian publik: partial, case-insensitive, memakai trigram index.
--    Urutan: kode tepat > nama tepat > awalan nama > awalan kata > mengandung.
-- =====================================================================
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
    g.id, g.grave_code, g.deceased_name, g.death_date, g.block_code, g.grave_number,
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

-- =====================================================================
-- 9. Storage foto makam (opsional, maks. 1 per makam, hasil kompres WebP/JPEG)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grave-photos', 'grave-photos', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists grave_photos_admin_select on storage.objects;
create policy grave_photos_admin_select on storage.objects
  for select to authenticated using (bucket_id = 'grave-photos' and (select public.is_admin()));
drop policy if exists grave_photos_admin_insert on storage.objects;
create policy grave_photos_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'grave-photos' and (select public.is_admin()));
drop policy if exists grave_photos_admin_update on storage.objects;
create policy grave_photos_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'grave-photos' and (select public.is_admin()))
  with check (bucket_id = 'grave-photos' and (select public.is_admin()));
drop policy if exists grave_photos_admin_delete on storage.objects;
create policy grave_photos_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'grave-photos' and (select public.is_admin()));
