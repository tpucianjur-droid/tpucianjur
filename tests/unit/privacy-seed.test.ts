import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pickFlags, computeVerificationStatus } from "@/lib/graves/verification";

const root = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const migration = read("supabase/migrations/20260924000002_v1_security_logic.sql");
// Migrasi terbaru yang membentuk view & RPC publik (nama ahli waris dibuka, telepon/alamat tidak).
const publicHeirMigration = read("supabase/migrations/20260925000001_public_heir_name.sql");

function walk(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

describe("privasi data ahli waris (AC-PUB-03, NFR-004)", () => {
  it("view public_graves hanya memuat nama ahli waris (tanpa telepon/alamat/catatan internal)", () => {
    const view = publicHeirMigration.match(/create or replace view public\.public_graves[\s\S]*?;/)?.[0] ?? "";
    expect(view).toContain("g.deceased_name");
    expect(view).toContain("g.heir_name");
    expect(view).not.toMatch(/heir_phone|heir_address|transcription|recorded_date_raw|verify_/);
  });

  it("RPC pencarian publik hanya mengembalikan nama ahli waris (tanpa telepon/alamat)", () => {
    const fn = publicHeirMigration.match(/create or replace function public\.search_public_graves[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toContain("from public.public_graves");
    expect(fn).toContain("heir_name");
    expect(fn).not.toMatch(/heir_phone|heir_address/);
  });

  it("anon tidak punya akses langsung ke tabel graves; tulis hanya untuk is_admin()", () => {
    expect(migration).toMatch(/revoke all on public\.graves from anon;/);
    const gravePolicies = migration.match(/create policy graves_\w+ on public\.graves[\s\S]*?;/g) ?? [];
    expect(gravePolicies.length).toBe(4);
    for (const policy of gravePolicies) {
      expect(policy).toContain("to authenticated");
      expect(policy).toContain("public.is_admin()");
    }
  });

  it("kode halaman & API publik tidak pernah memilih telepon/alamat ahli waris", () => {
    const publicFiles = [
      "src/lib/data/public.ts",
      ...walk("src/app/(public)"),
      ...walk("src/app/api"),
      ...walk("src/components/public"),
      ...walk("src/components/denah"),
    ].filter((f) => /\.(ts|tsx)$/.test(f));
    for (const file of publicFiles) {
      expect(read(file), file).not.toMatch(/heir_(phone|address)/);
    }
  });

  it("service-role key tidak dipakai di kode aplikasi", () => {
    for (const file of walk("src").filter((f) => /\.(ts|tsx)$/.test(f))) {
      expect(read(file), file).not.toMatch(/SERVICE_ROLE|service_role/i);
    }
  });
});

/** Parser minimal CSV (mendukung tanda kutip & koma di dalam field). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  const [header, ...data] = rows.filter((r) => r.some((c) => c !== ""));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

describe("seed 149 data awal (FR-014, AC-ADM-07)", () => {
  const csv = parseCsv(read("03_Data_Seed/data_makam_149_blok_A_STAGING.csv"));
  const seedSql = read("supabase/seed/01_seed_149_blok_A_STAGING.sql");
  const graveInserts = seedSql.match(/^insert into public\.graves .*$/gm) ?? [];

  it("seed di supabase/ identik dengan file sumber 03_Data_Seed (tidak diubah)", () => {
    const original = read("03_Data_Seed/seed_149_blok_A_STAGING.sql").replace(/\r\n/g, "\n").trim();
    expect(seedSql.replace(/\r\n/g, "\n")).toContain(original);
  });

  it("149 record, semua Blok A, kode A-001..A-149 tanpa duplikat", () => {
    expect(csv).toHaveLength(149);
    expect(graveInserts).toHaveLength(149);
    expect(new Set(csv.map((r) => r.block_code))).toEqual(new Set(["A"]));
    expect(csv.map((r) => r.grave_code)).toEqual(Array.from({ length: 149 }, (_, i) => `A-${String(i + 1).padStart(3, "0")}`));
    for (const [i, line] of graveInserts.entries()) {
      expect(line).toContain(`'A-${String(i + 1).padStart(3, "0")}'`);
      expect(line).toContain("b.code='A'");
    }
  });

  it("status verifikasi staging konsisten dengan flag per field (dihitung ulang oleh trigger)", () => {
    const toBool = (v: string) => v === "True";
    let needs = 0;
    for (const row of csv) {
      const status = computeVerificationStatus(
        pickFlags({
          verify_deceased_name: toBool(row.verify_deceased_name),
          verify_death_date: toBool(row.verify_death_date),
          verify_heir_name: toBool(row.verify_heir_name),
          verify_heir_phone: toBool(row.verify_heir_phone),
          verify_heir_address: toBool(row.verify_heir_address),
          verify_location: toBool(row.verify_location),
        }),
      );
      expect(status, row.grave_code).toBe(row.verification_status);
      if (status === "NEEDS_VERIFICATION") needs++;
    }
    expect(needs).toBe(115);
  });

  it("simulasi denah hanya mengisi grid Blok A, kapasitas tetap kosong (TBD)", () => {
    const sim = read("supabase/seed/02_simulasi_denah_blok_A.sql");
    expect(sim).toMatch(/grid_columns = 10/);
    expect(sim).not.toMatch(/capacity\s*=/);
  });
});
