-- =====================================================================
-- Mendaftarkan akun Admin/Operator (jalankan SETELAH SETUP_SUPABASE_ONLINE.sql)
--
-- 1) Supabase Dashboard -> Authentication -> Users -> "Add user" -> "Create new user"
--    Isi email + password kuat, centang "Auto Confirm User".
-- 2) Ganti email di bawah, lalu jalankan di SQL Editor.
--
-- Hanya user yang ada di public.admin_users yang dapat membuka /admin dan membaca data ahli waris.
-- =====================================================================
insert into public.admin_users (user_id, email, display_name)
select u.id, u.email, 'Operator TPU'
from auth.users u
where u.email = 'GANTI_DENGAN_EMAIL_ADMIN@contoh.id'
on conflict (user_id) do update
  set email = excluded.email,
      display_name = excluded.display_name;

-- Cek daftar Admin:
select a.email, a.display_name, a.created_at from public.admin_users a order by a.created_at;

-- Mencabut akses Admin (akun Auth tetap ada):
-- delete from public.admin_users where email = 'email@contoh.id';
