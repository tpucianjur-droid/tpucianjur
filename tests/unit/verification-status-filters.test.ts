import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildStatusTabs } from "@/lib/admin/list-filters";
import { ALL_VERIFIED, computeVerificationStatus, pickFlags, VERIFY_FIELD_KEYS, type VerificationFlags } from "@/lib/graves/verification";
import { graveFormSchema } from "@/lib/validation";

/**
 * Regression status verifikasi: status global = turunan flag per field, dan Data Makam / Dashboard
 * menghitung dari kolom verification_status yang sama (tanpa hitungan terpisah di UI).
 */

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

type Result = { data: Row[] | null; count: number; error: null };

/** Query builder Supabase tiruan (subset yang dipakai lib/data/admin): filter dievaluasi di memori. */
class FakeQuery {
  private filters: ((row: Row) => boolean)[] = [];
  private head = false;
  private window: [number, number] | null = null;
  constructor(private rows: Row[]) {}
  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.head = Boolean(options?.head);
    return this;
  }
  is(column: string, value: null) {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  not(column: string, operator: string, value: null) {
    if (operator !== "is") throw new Error(`operator ${operator} belum didukung`);
    this.filters.push((row) => (row[column] ?? null) !== value);
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  or(expression: string) {
    // Hanya pola pencarian "kolom.ilike.*kata*,..." (daftar Data Makam) yang dievaluasi; pola lain
    // (query audit_logs Dashboard, tabelnya kosong di test ini) tidak pernah cocok.
    const terms = expression.split(",").map((part) => {
      const [column, pattern] = part.split(".ilike.");
      return { column, needle: pattern === undefined ? null : pattern.replace(/\*/g, "").toLowerCase() };
    });
    this.filters.push((row) =>
      terms.some((t) => t.needle !== null && String(row[t.column] ?? "").toLowerCase().includes(t.needle)),
    );
    return this;
  }
  gte() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  range(from: number, to: number) {
    this.window = [from, to];
    return this;
  }
  /** Dapat di-await seperti builder asli. */
  then(resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) {
    const matched = this.rows.filter((row) => this.filters.every((f) => f(row)));
    const data = this.head ? null : this.window ? matched.slice(this.window[0], this.window[1] + 1) : matched;
    return Promise.resolve<Result>({ data, count: matched.length, error: null }).then(resolve, reject);
  }
}

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({ from: (table: string) => new FakeQuery(tables[table] ?? []) }),
}));

const { countNeedsVerification, getDashboardData, listGraves, parseListFilters } = await import("@/lib/data/admin");

const BLOCK_A = "11111111-1111-4111-8111-111111111111";
const BLOCK_B = "22222222-2222-4222-8222-222222222222";

/** Meniru trigger tg_graves_before_write: verification_status selalu dihitung dari flag. */
function grave(code: string, flags: Partial<VerificationFlags>, extra: Row = {}): Row {
  const all = { ...ALL_VERIFIED, ...flags };
  return {
    id: code,
    grave_code: code,
    deceased_name: `Nama ${code}`,
    heir_name: null,
    block_id: BLOCK_A,
    archived_at: null,
    created_at: "2026-09-24T16:18:00Z",
    ...all,
    verification_status: computeVerificationStatus(all),
    ...extra,
  };
}

beforeEach(() => {
  tables.graves = [
    grave("A-001", {}), // sudah diverifikasi manual
    grave("A-002", {}),
    grave("A-003", {}, { heir_name: "Siti Aminah" }),
    grave("A-004", { verify_heir_address: true }), // masih ada 1 field belum diverifikasi
    grave("A-005", { verify_deceased_name: true, verify_death_date: true }, { heir_name: "Siti Rohani" }),
    grave("B-001", { verify_location: true }, { block_id: BLOCK_B }),
    grave("D-001", {}, { archived_at: "2026-09-25T00:00:00Z" }),
    grave("D-002", { verify_heir_phone: true }, { archived_at: "2026-09-25T00:00:00Z" }),
  ];
  tables.blocks = [];
  tables.block_grave_counts = [];
  tables.audit_logs = [];
});

const codes = (items: { grave_code: string }[]) => items.map((g) => g.grave_code);
const list = (params: Record<string, string>) => listGraves(parseListFilters(params));

describe("status verifikasi global dari flag per field", () => {
  it("semua field sudah benar => VERIFIED", () => {
    expect(computeVerificationStatus(ALL_VERIFIED)).toBe("VERIFIED");
  });

  it("satu field saja belum diverifikasi => NEEDS_VERIFICATION (untuk setiap field)", () => {
    for (const key of VERIFY_FIELD_KEYS) {
      expect(computeVerificationStatus({ ...ALL_VERIFIED, [key]: true })).toBe("NEEDS_VERIFICATION");
    }
  });

  it("record yang sudah diverifikasi tidak kembali merah saat disimpan ulang tanpa perubahan flag", () => {
    const saved = pickFlags({ ...ALL_VERIFIED });
    // Form mengirim flag lewat hidden input: "" = sudah benar, "on" = perlu dicek.
    const form = Object.fromEntries(VERIFY_FIELD_KEYS.map((key) => [key, saved[key] ? "on" : ""]));
    const parsed = graveFormSchema.parse({
      deceased_name: "Nana Sutiarna",
      death_date: "",
      date_semantics: "WAFAT",
      block_id: BLOCK_A,
      grave_number: "1",
      is_public: "on",
      ...form,
    });
    expect(computeVerificationStatus(pickFlags(parsed))).toBe("VERIFIED");
  });

  it("record yang masih perlu dicek tetap NEEDS_VERIFICATION saat disimpan biasa", () => {
    const parsed = graveFormSchema.parse({
      deceased_name: "Ahmad",
      death_date: "",
      date_semantics: "WAFAT",
      block_id: BLOCK_A,
      grave_number: "5",
      verify_heir_address: "on",
    });
    expect(computeVerificationStatus(pickFlags(parsed))).toBe("NEEDS_VERIFICATION");
  });
});

describe("filter status Data Makam", () => {
  it("Semua => semua data aktif (tanpa arsip)", async () => {
    const { items, total } = await list({});
    expect(total).toBe(6);
    expect(codes(items)).not.toContain("D-001");
  });

  it("Perlu Verifikasi => hanya NEEDS_VERIFICATION aktif", async () => {
    const { items } = await list({ status: "needs_verification" });
    expect(codes(items)).toEqual(["A-004", "A-005", "B-001"]);
    expect(items.every((g) => g.verification_status === "NEEDS_VERIFICATION")).toBe(true);
  });

  it("Terverifikasi => hanya VERIFIED aktif", async () => {
    const { items } = await list({ status: "verified" });
    expect(codes(items)).toEqual(["A-001", "A-002", "A-003"]);
  });

  it("Arsip => hanya data yang diarsipkan (apa pun statusnya)", async () => {
    const { items } = await list({ status: "archived" });
    expect(codes(items)).toEqual(["D-001", "D-002"]);
  });

  it("cari + status + blok dapat dipakai bersama", async () => {
    expect(codes((await list({ status: "verified", q: "siti" })).items)).toEqual(["A-003"]);
    expect(codes((await list({ status: "needs_verification", q: "siti" })).items)).toEqual(["A-005"]);
    expect(codes((await list({ status: "needs_verification", blok: BLOCK_B })).items)).toEqual(["B-001"]);
    expect(codes((await list({ status: "verified", blok: BLOCK_B })).items)).toEqual([]);
  });
});

describe("hitungan status (Dashboard & Data Makam)", () => {
  it("Dashboard: total aktif, perlu verifikasi, dan terverifikasi dari data aktual", async () => {
    const data = await getDashboardData(new Date("2026-09-25T12:00:00Z"));
    expect(data.total).toBe(6);
    expect(data.needsVerification).toBe(3);
    expect(data.verified).toBe(3);
  });

  it("badge Perlu Verifikasi = jumlah daftar Perlu Verifikasi", async () => {
    expect(await countNeedsVerification()).toBe((await list({ status: "needs_verification" })).total);
  });

  it("verifikasi satu record hanya mengubah hitungan record itu", async () => {
    const target = tables.graves.find((g) => g.grave_code === "A-004")!;
    Object.assign(target, { verify_heir_address: false, verification_status: "VERIFIED" });
    const data = await getDashboardData(new Date("2026-09-25T12:00:00Z"));
    expect(data.needsVerification).toBe(2);
    expect(data.verified).toBe(4);
  });
});

describe("tombol filter status", () => {
  it("empat pilihan, status aktif ditandai, cari & blok dipertahankan, halaman & field direset", () => {
    const tabs = buildStatusTabs("/admin/makam", { q: "Siti", block: BLOCK_A, status: "needs_verification" });
    expect(tabs.map((t) => t.label)).toEqual(["Semua", "Perlu Verifikasi", "Terverifikasi", "Arsip"]);
    expect(tabs.filter((t) => t.active).map((t) => t.value)).toEqual(["needs_verification"]);
    expect(tabs[0].href).toBe(`/admin/makam?q=Siti&blok=${BLOCK_A}`);
    expect(tabs[2].href).toBe(`/admin/makam?q=Siti&blok=${BLOCK_A}&status=verified`);
    for (const tab of tabs) expect(tab.href).not.toMatch(/page=|field=/);
  });

  it("tanpa filter lain, Semua = /admin/makam", () => {
    const tabs = buildStatusTabs("/admin/makam", { q: "", block: null, status: "all" });
    expect(tabs[0]).toMatchObject({ href: "/admin/makam", active: true });
    expect(tabs[3].href).toBe("/admin/makam?status=archived");
  });
});
