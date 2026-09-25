// Menggabungkan migration + seed menjadi satu file untuk ditempel ke Supabase SQL Editor (project hosted).
// Jalankan: npm run db:setup-sql
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const seedDir = join(root, "supabase", "seed");
const outDir = join(root, "supabase", "setup");
mkdirSync(outDir, { recursive: true });

const read = (path) => readFileSync(path, "utf8").replace(/^﻿/, "");
const files = [
  ...readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort().map((f) => join(migrationsDir, f)),
  ...readdirSync(seedDir).filter((f) => f.endsWith(".sql")).sort().map((f) => join(seedDir, f)),
];

const header = `-- =====================================================================
-- SETUP LENGKAP SUPABASE (HOSTED) — Sistem Aplikasi Pemakaman TPU Astana Pratiksha Cianjur
-- File ini DIHASILKAN oleh scripts/build-setup-sql.mjs. Jangan edit manual;
-- ubah file di supabase/migrations atau supabase/seed lalu jalankan: npm run db:setup-sql
--
-- Cara pakai: Supabase Dashboard -> SQL Editor -> New query -> tempel seluruh isi file -> Run.
-- Aman dijalankan ulang (idempotent): seed memakai ON CONFLICT DO NOTHING.
-- =====================================================================

-- Pra-langkah agar baseline dapat dijalankan ulang (view publik dibuat ulang di migrasi berikutnya).
drop view if exists public.public_graves;
drop function if exists public.search_public_graves(text, text, text, integer, integer);
`;

const body = files
  .map((file) => `\n-- ---------------------------------------------------------------------\n-- ${file.slice(root.length + 1).replace(/\\/g, "/")}\n-- ---------------------------------------------------------------------\n${read(file).trim()}\n`)
  .join("");

const footer = `
-- ---------------------------------------------------------------------
-- Ringkasan hasil (harus: 149 makam, semua Blok A, A-001..A-149)
-- ---------------------------------------------------------------------
select
  count(*) as total_makam,
  count(*) filter (where b.code = 'A') as blok_a,
  min(g.grave_code) as kode_pertama,
  max(g.grave_code) as kode_terakhir,
  count(*) filter (where g.verification_status = 'NEEDS_VERIFICATION') as perlu_verifikasi,
  count(*) filter (where g.verification_status = 'VERIFIED') as terverifikasi
from public.graves g
left join public.blocks b on b.id = g.block_id;
`;

const output = join(outDir, "SETUP_SUPABASE_ONLINE.sql");
writeFileSync(output, header + body + footer, "utf8");
console.log(`Ditulis: ${output.slice(root.length + 1)} (${files.length} file digabung)`);
