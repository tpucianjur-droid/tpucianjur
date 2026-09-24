import { describe, expect, it } from "vitest";
import { buildMonthlySeries, classifyActivity, monthKeyWib, niceAxis, percent, rangeStartIso } from "@/lib/dashboard/stats";

const base = { before_status: null, after_status: null, before_archived: null, after_archived: null };

describe("dashboard stats", () => {
  it("mengelompokkan bulan menurut WIB (UTC+7)", () => {
    // 31 Agustus 2026 20:00 UTC = 1 September 2026 03:00 WIB.
    expect(monthKeyWib("2026-08-31T20:00:00Z")).toBe("2026-09");
    expect(monthKeyWib("2026-08-31T16:00:00Z")).toBe("2026-08");
    expect(monthKeyWib("bukan tanggal")).toBeNull();
  });

  it("batas bawah query = awal bulan WIB, 11 bulan sebelum bulan berjalan", () => {
    expect(rangeStartIso(new Date("2026-09-25T03:00:00Z"))).toBe("2025-09-30T17:00:00.000Z");
  });

  it("deret 12 bulan terakhir: data dimasukkan & terverifikasi, di luar rentang diabaikan", () => {
    const series = buildMonthlySeries(
      new Date("2026-09-25T03:00:00Z"),
      ["2026-09-01T01:00:00Z", "2026-09-10T01:00:00Z", "2025-12-05T00:00:00Z", "2024-01-01T00:00:00Z"],
      ["2026-08-31T20:00:00Z"],
    );
    expect(series).toHaveLength(12);
    expect(series[0]).toMatchObject({ key: "2025-10", label: "Okt" });
    expect(series[11]).toMatchObject({ key: "2026-09", label: "Sep", inserted: 2, verified: 1 });
    expect(series.find((p) => p.key === "2025-12")?.inserted).toBe(1);
    expect(series.reduce((sum, p) => sum + p.inserted, 0)).toBe(3);
  });

  it("jenis aktivitas dari audit log", () => {
    expect(classifyActivity({ ...base, action: "INSERT" })).toBe("create");
    expect(classifyActivity({ ...base, action: "UPDATE", before_status: "NEEDS_VERIFICATION", after_status: "VERIFIED" })).toBe("verify");
    expect(classifyActivity({ ...base, action: "UPDATE", before_status: "VERIFIED", after_status: "VERIFIED" })).toBe("update");
    expect(classifyActivity({ ...base, action: "UPDATE", after_archived: "2026-09-01T00:00:00Z" })).toBe("archive");
    expect(classifyActivity({ ...base, action: "UPDATE", before_archived: "2026-09-01T00:00:00Z" })).toBe("restore");
    expect(classifyActivity({ ...base, action: "DELETE" })).toBe("delete");
  });

  it("persentase satu desimal & aman untuk total 0", () => {
    expect(percent(115, 149)).toBe(77.2);
    expect(percent(34, 149)).toBe(22.8);
    expect(percent(5, 0)).toBe(0);
  });

  it("sumbu Y dengan angka bulat", () => {
    expect(niceAxis(149)).toEqual({ max: 200, ticks: [0, 50, 100, 150, 200] });
    expect(niceAxis(3)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
    expect(niceAxis(0).max).toBe(4);
  });
});
