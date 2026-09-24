import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SearchImpl = (...args: unknown[]) => Promise<unknown>;
const calls: unknown[][] = [];
let searchImpl: SearchImpl = async () => ({ items: [], total: 0 });
vi.mock("@/lib/data/public", () => ({
  searchPublicGraves: (...args: unknown[]) => {
    calls.push(args);
    return searchImpl(...args);
  },
}));

const { GET } = await import("@/app/api/cari/route");
const { proxy } = await import("@/proxy");

describe("GET /api/cari", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("menolak kata kunci < 2 huruf tanpa memanggil database", async () => {
    const res = await GET(new NextRequest("http://localhost/api/cari?q=R"));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("partial & case-insensitive: meneruskan kata kunci yang dinormalisasi + cache CDN singkat", async () => {
    searchImpl = async () => ({ items: [{ id: "1", grave_code: "A-012", deceased_name: "Rita Mangsari" }], total: 1 });
    const res = await GET(new NextRequest("http://localhost/api/cari?q=%20%20rita%20&blok=a"));
    expect(res.status).toBe(200);
    expect(calls).toEqual([[{ term: "rita", code: null, block: "A" }, 0]]);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=");
    await expect(res.json()).resolves.toMatchObject({ total: 1 });
  });

  it("error database => 503 dengan pesan sederhana (tanpa detail teknis)", async () => {
    searchImpl = async () => {
      throw new Error("connection refused at 10.0.0.1");
    };
    const res = await GET(new NextRequest("http://localhost/api/cari?q=rita"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Data belum dapat dimuat. Coba lagi.");
    expect(JSON.stringify(body)).not.toContain("10.0.0.1");
  });
});

describe("proteksi /admin (AC-ADM-01)", () => {
  it("tanpa sesi: /admin dan sub-halaman dialihkan ke /admin/login", async () => {
    for (const path of ["/admin", "/admin/makam", "/admin/makam/tambah", "/admin/pengaturan"]) {
      const res = await proxy(new NextRequest(`http://localhost${path}`));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
    }
  });

  it("halaman login tetap dapat dibuka tanpa sesi", async () => {
    const res = await proxy(new NextRequest("http://localhost/admin/login"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
