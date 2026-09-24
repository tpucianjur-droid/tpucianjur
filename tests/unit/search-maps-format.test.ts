import { describe, expect, it } from "vitest";
import { buildDirectionsUrl, buildMapsUrl, findPlusCode } from "@/lib/maps";
import { buildSearchInput, isSearchable, normalizeSearchTerm, sanitizeForPostgrestFilter } from "@/lib/search/normalize";
import { buildSearchQueryString, fetchSearch, SearchRequestError } from "@/lib/search/client";
import { formatDate, padGraveNumber } from "@/lib/format";
import { csvCell, toCsv } from "@/lib/csv";

const TPU = "Tempat Kerja, 548F+PCC, Nagrak, Kec. Cianjur, Kabupaten Cianjur, Jawa Barat 43215";

describe("pencarian", () => {
  it("normalisasi: trim, spasi ganda, karakter kontrol", () => {
    expect(normalizeSearchTerm("  Rita   Mangsari \n")).toBe("Rita Mangsari");
    expect(normalizeSearchTerm(undefined)).toBe("");
    expect(normalizeSearchTerm("a".repeat(500))).toHaveLength(100);
  });

  it("minimal 2 karakter (AC-PUB-01)", () => {
    expect(isSearchable("R")).toBe(false);
    expect(isSearchable("Ri")).toBe(true);
  });

  it("partial name dikirim apa adanya; kode makam dikenali; filter blok divalidasi", () => {
    expect(buildSearchInput("rita", "a")).toEqual({ term: "rita", code: null, block: "A" });
    expect(buildSearchInput("a-032", "")).toEqual({ term: "a-032", code: "A-032", block: null });
    expect(buildSearchInput("rita", "A;drop").block).toBeNull();
  });

  it("input admin tidak dapat menyisipkan filter PostgREST", () => {
    expect(sanitizeForPostgrestFilter("siti,heir_phone.not.is.null")).toBe("siti heir_phone.not.is.null");
    expect(sanitizeForPostgrestFilter("a*(b)%")).toBe("a b");
  });

  it("query string API pencarian", () => {
    expect(buildSearchQueryString("rita", "A", 20)).toBe("q=rita&blok=A&offset=20");
    expect(buildSearchQueryString("rita", null)).toBe("q=rita");
  });

  it("fetchSearch mengembalikan hasil atau melempar pesan sederhana", async () => {
    const ok = (async () =>
      new Response(JSON.stringify({ items: [{ id: "1", grave_code: "A-001" }], total: 1 }), { status: 200 })) as unknown as typeof fetch;
    await expect(fetchSearch("rita", null, 0, new AbortController().signal, ok)).resolves.toMatchObject({ total: 1 });

    const fail = (async () => new Response(JSON.stringify({ error: "Data belum dapat dimuat. Coba lagi." }), { status: 503 })) as unknown as typeof fetch;
    await expect(fetchSearch("rita", null, 0, new AbortController().signal, fail)).rejects.toBeInstanceOf(SearchRequestError);
  });
});

describe("Google Maps (satu titik TPU, configurable)", () => {
  it("memakai query lokasi dari pengaturan", () => {
    const url = buildDirectionsUrl({ google_maps_query: TPU, google_maps_url: null, address: null });
    expect(url).toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(TPU)}`);
    expect(buildMapsUrl({ google_maps_query: TPU, google_maps_url: null, address: null })).toContain("548F%2BPCC");
  });

  it("link khusus Admin diprioritaskan, link tidak aman diabaikan", () => {
    expect(buildMapsUrl({ google_maps_query: TPU, google_maps_url: "https://maps.app.goo.gl/abc", address: null })).toBe(
      "https://maps.app.goo.gl/abc",
    );
    expect(buildMapsUrl({ google_maps_query: TPU, google_maps_url: "javascript:alert(1)", address: null })).toContain(
      "google.com/maps/search",
    );
  });

  it("tanpa konfigurasi => null (tombol dinonaktifkan)", () => {
    expect(buildMapsUrl(null)).toBeNull();
    expect(buildDirectionsUrl({ google_maps_query: "", google_maps_url: null, address: null })).toBeNull();
  });

  it("Plus Code diambil dari alamat untuk kartu lokasi", () => {
    expect(findPlusCode(TPU)).toBe("548F+PCC");
    expect(findPlusCode("6r59548f+pcc Cianjur")).toBe("6R59548F+PCC");
    expect(findPlusCode("Jl. Raya Cianjur No. 12")).toBeNull();
    expect(findPlusCode(null)).toBeNull();
  });
});

describe("format & CSV", () => {
  it("tanggal Indonesia; kosong => fallback", () => {
    expect(formatDate("2024-08-17")).toBe("17 Agustus 2024");
    expect(formatDate(null)).toBe("Belum tercatat");
    expect(padGraveNumber(7)).toBe("007");
  });

  it("CSV aman dari formula injection dan escape tanda kutip", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell('Jl. "Aster", RT 03')).toBe('"Jl. ""Aster"", RT 03"');
    const csv = toCsv(["a", "b"], [[1, null]]);
    expect(csv.startsWith("﻿a,b\r\n1,")).toBe(true);
  });
});
