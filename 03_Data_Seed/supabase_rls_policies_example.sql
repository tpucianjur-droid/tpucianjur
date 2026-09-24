-- Contoh RLS V1. Sesuaikan sebelum production.

alter table public.cemeteries enable row level security;
alter table public.blocks enable row level security;
alter table public.graves enable row level security;
alter table public.audit_logs enable row level security;

-- Konfigurasi publik yang tidak sensitif.
create policy if not exists cemeteries_public_read on public.cemeteries for select to anon, authenticated using (true);
create policy if not exists blocks_public_read on public.blocks for select to anon, authenticated using (is_active = true);

-- V1 menganggap semua akun authenticated adalah akun Admin/Operator yang dibuat pengelola.
create policy if not exists graves_admin_select on public.graves for select to authenticated using (true);
create policy if not exists graves_admin_insert on public.graves for insert to authenticated with check (true);
create policy if not exists graves_admin_update on public.graves for update to authenticated using (true) with check (true);
create policy if not exists graves_admin_delete on public.graves for delete to authenticated using (true);

create policy if not exists blocks_admin_insert on public.blocks for insert to authenticated with check (true);
create policy if not exists blocks_admin_update on public.blocks for update to authenticated using (true) with check (true);
create policy if not exists blocks_admin_delete on public.blocks for delete to authenticated using (true);
create policy if not exists cemeteries_admin_insert on public.cemeteries for insert to authenticated with check (true);
create policy if not exists cemeteries_admin_update on public.cemeteries for update to authenticated using (true) with check (true);

create policy if not exists audit_admin_read on public.audit_logs for select to authenticated using (true);
create policy if not exists audit_admin_insert on public.audit_logs for insert to authenticated with check (true);

-- Jangan berikan SELECT anon pada public.graves. Halaman publik harus menggunakan public.public_graves.
