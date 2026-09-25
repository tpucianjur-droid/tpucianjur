import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { pageList } from "@/lib/admin/pagination";
import { resolveBackHref } from "@/lib/admin/save-flow";
import { describeListFilters, parseListFilters } from "@/lib/data/admin";
import { BLOCK_LAYOUTS, buildBlockLayout, getBlockLayout, layoutSlot } from "@/lib/denah/block-layouts";
import { blockExtent, resolvePosition } from "@/lib/denah/layout";
import { buildGraveListPdf, shortDate, type GravePdfRow } from "@/lib/pdf/grave-list-pdf";
import { FONT_WIDTHS, textWidth, wrapText } from "@/lib/pdf/writer";

const blockA = { code: "A", grid_rows: 15, grid_columns: 10 };
const noPos = { visual_x: null, visual_y: null, visual_row: null, visual_column: null };

describe("denah Blok A: layout baris data-driven", () => {
  const layout = getBlockLayout("A")!;

  it("baris 1–5 sesuai data lapangan, baris 6 berlanjut (tidak final)", () => {
    const ranges = layout.rows.slice(0, 6).map((r) => [r.start, r.end, r.status]);
    expect(ranges).toEqual([
      [1, 21, "known"],
      [22, 54, "known"],
      [55, 87, "known"],
      [88, 120, "known"],
      [121, 153, "known"],
      [154, expect.any(Number), "ongoing"],
    ]);
    expect(layout.rows[5].end).toBeGreaterThanOrEqual(163);
    expect(layout.filledThrough).toBe(163);
  });

  it("simulasi sampai kapasitas 1000, panjang baris bervariasi", () => {
    expect(layout.capacity).toBe(1000);
    expect(layout.rows.at(-1)?.end).toBe(1000);
    expect(layout.rows.slice(6).every((r) => r.status === "simulated")).toBe(true);
    const counts = new Set(layout.rows.map((r) => r.end - r.start + 1));
    expect(counts.size).toBeGreaterThan(3);
    // Nomor berurutan tanpa celah/tumpang tindih.
    layout.rows.forEach((r, i) => i > 0 && expect(r.start).toBe(layout.rows[i - 1].end + 1));
  });

  it("nomor makam => posisi baris/kolom dari config (offset dihitung)", () => {
    expect(layoutSlot(layout, 1)).toEqual({ x: 1, y: 1 });
    expect(layoutSlot(layout, 21)).toEqual({ x: 21, y: 1 });
    expect(layoutSlot(layout, 22)).toEqual({ x: 1, y: 2 });
    expect(layoutSlot(layout, 163)).toEqual({ x: 10, y: 6 });
    expect(layoutSlot(layout, 1001)).toBeNull();
    expect(resolvePosition({ ...noPos, grave_number: 32 }, blockA)).toEqual({ x: 11, y: 2, source: "layout" });
    // Posisi manual Admin tetap menimpa layout.
    expect(resolvePosition({ ...noPos, grave_number: 32, visual_row: 3, visual_column: 4 }, blockA)).toEqual({ x: 4, y: 3, source: "grid" });
  });

  it("kanvas mengikuti layout (bukan grid 10 kolom lama)", () => {
    expect(blockExtent([], blockA)).toEqual({ columns: layout.columns, rows: layout.rows.length });
  });

  it("config tidak menjumlah melebihi kapasitas", () => {
    const small = buildBlockLayout({ capacity: 10, filledThrough: 3, rows: [{ count: 6 }, { count: 6 }, { count: 6 }] });
    expect(small.rows.map((r) => [r.start, r.end])).toEqual([
      [1, 6],
      [7, 10],
    ]);
  });

  it("Blok B–D belum dipetakan: tidak ada layout palsu", () => {
    for (const code of ["B", "C", "D"]) {
      expect(BLOCK_LAYOUTS[code]).toBeUndefined();
      expect(resolvePosition({ ...noPos, grave_number: 5 }, { code, grid_rows: null, grid_columns: null })).toBeNull();
    }
  });
});

describe("export PDF Data Makam", () => {
  const row = (i: number, extra: Partial<GravePdfRow> = {}): GravePdfRow => ({
    code: `A-${String(i).padStart(3, "0")}`,
    name: `Almarhum ${i}`,
    heirName: `Ahli Waris ${i}`,
    deathDate: "2025-02-10",
    block: "A",
    number: i,
    verified: i % 2 === 0,
    ...extra,
  });

  const pdfText = (bytes: Uint8Array) => {
    const raw = Buffer.from(bytes).toString("latin1");
    const streams = [...raw.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) =>
      inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"),
    );
    // Teks ditulis sebagai hex string <...> Tj.
    const texts = streams.map((s) =>
      [...s.matchAll(/<([0-9a-f]+)> Tj/g)].map((m) => Buffer.from(m[1], "hex").toString("latin1")).join("|"),
    );
    return { raw, texts };
  };

  it("PDF valid, A4 landscape, multi-halaman, header tabel & footer di setiap halaman", () => {
    const rows = Array.from({ length: 150 }, (_, i) => row(i + 1));
    const pdf = buildGraveListPdf(rows, { exportedAt: new Date("2026-09-25T05:27:00Z"), filters: ["Blok: Blok A", "Status: Terverifikasi"] });
    const { raw, texts } = pdfText(pdf);
    expect(raw.startsWith("%PDF-1.4")).toBe(true);
    expect(raw.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(raw).toContain("/MediaBox [0 0 842 595]");
    expect(texts.length).toBeGreaterThan(3);
    texts.forEach((t, i) => {
      expect(t).toContain("DATA MAKAM");
      expect(t).toContain("Ahli Waris");
      expect(t).toContain("Nomor");
      expect(t).toContain(`Halaman ${i + 1} dari ${texts.length}`);
      expect(t).toContain("TPU Astana Pratiksha Cianjur");
      expect(t).toContain("Blok: Blok A");
      expect(t).not.toContain("…");
    });
    expect(texts[0]).toContain("Tanggal export: 25 September 2026");
    expect(texts[0]).toContain("Pukul: 12.27 WIB");
    // Semua baris ada, berurutan, tidak ada yang hilang saat pindah halaman.
    const all = texts.join("|");
    for (const i of [1, 75, 150]) expect(all).toContain(`Ahli Waris ${i}`);
    expect(Number(/\/Count (\d+)/.exec(raw)?.[1])).toBe(texts.length);
  });

  it("nama/ahli waris panjang dibungkus, ahli waris kosong = 'Belum diisi'", () => {
    const long = "Raden Haji Muhammad Abdurrahman Wiradikusumah Suryadiningrat Kartanegara Putra";
    const { texts } = pdfText(buildGraveListPdf([row(1, { name: long, heirName: null })], { exportedAt: new Date(), filters: [] }));
    expect(texts[0]).toContain("Belum diisi");
    expect(texts[0]).not.toContain(long); // terbagi ke beberapa baris
    expect(texts[0]).not.toContain("Filter:");
  });

  it("data kosong tetap menghasilkan 1 halaman", () => {
    const { texts } = pdfText(buildGraveListPdf([], { exportedAt: new Date(), filters: ["Kata kunci: \"xyz\""] }));
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("Tidak ada data sesuai filter.");
  });

  it("metrik font & wrap", () => {
    expect(FONT_WIDTHS.regular).toHaveLength(95);
    expect(FONT_WIDTHS.bold).toHaveLength(95);
    expect(textWidth("AAAA", "regular", 10)).toBeCloseTo(26.68);
    for (const line of wrapText("Nama yang sangat panjang sekali untuk kolom sempit", "regular", 9, 60)) {
      expect(textWidth(line, "regular", 9)).toBeLessThanOrEqual(60);
    }
    expect(shortDate("2025-02-10")).toBe("10 Feb 2025");
    expect(shortDate(null)).toBe("—");
  });
});

describe("Data Makam: filter, paginasi, kembali ke daftar", () => {
  it("field perlu dicek hanya berlaku pada status Perlu Verifikasi", () => {
    expect(parseListFilters({ status: "verified", field: "verify_heir_name" }).field).toBeNull();
    expect(parseListFilters({ status: "needs_verification", field: "verify_heir_name" }).field).toBe("verify_heir_name");
  });

  it("ringkasan filter untuk PDF", () => {
    const blocks = [{ id: "11111111-1111-1111-1111-111111111111", name: "Blok A" }];
    const filters = parseListFilters({ blok: blocks[0].id, status: "verified", q: "Siti" });
    expect(describeListFilters(filters, blocks)).toEqual(["Blok: Blok A", "Status: Terverifikasi", 'Kata kunci: "Siti"']);
    expect(describeListFilters(parseListFilters({}), blocks)).toEqual([]);
  });

  it("URL kembali hanya ke /admin/makam (cegah open redirect)", () => {
    expect(resolveBackHref("/admin/makam?status=verified&page=2")).toBe("/admin/makam?status=verified&page=2");
    expect(resolveBackHref("/admin/makam")).toBe("/admin/makam");
    expect(resolveBackHref("https://evil.example")).toBe("/admin/makam");
    expect(resolveBackHref("//evil.example/admin/makam")).toBe("/admin/makam");
    expect(resolveBackHref("/admin/makamx")).toBe("/admin/makam");
    expect(resolveBackHref("/admin/pengaturan")).toBe("/admin/makam");
    expect(resolveBackHref(undefined, "verifikasi")).toBe("/admin/makam?status=needs_verification");
  });

  it("paginasi bernomor dengan celah", () => {
    expect(pageList(1, 15)).toEqual([1, 2, 3, 4, null, 15]);
    expect(pageList(8, 15)).toEqual([1, null, 7, 8, 9, null, 15]);
    expect(pageList(15, 15)).toEqual([1, null, 12, 13, 14, 15]);
    expect(pageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
