import { describe, expect, it, vi } from "vitest";
import { blockExtent, canvasSize, cellKey, resolvePosition } from "@/lib/denah/layout";
import { encodeWithinBudget, fitWithin } from "@/lib/photo/compress";
import { buildPhotoPath, validateCompressedPhoto } from "@/lib/photo/validate";

const blockA = { grid_rows: 15, grid_columns: 10 };
const base = { grave_number: 32, visual_x: null, visual_y: null, visual_row: null, visual_column: null };

describe("denah: posisi configurable", () => {
  it("simulasi otomatis dari nomor (A-032 => baris 4, kolom 2 pada grid 10 kolom)", () => {
    expect(resolvePosition(base, blockA)).toEqual({ x: 2, y: 4, source: "auto" });
    expect(resolvePosition({ ...base, grave_number: 1 }, blockA)).toEqual({ x: 1, y: 1, source: "auto" });
    expect(resolvePosition({ ...base, grave_number: 149 }, blockA)).toEqual({ x: 9, y: 15, source: "auto" });
  });

  it("row/column dari Admin menimpa posisi otomatis", () => {
    expect(resolvePosition({ ...base, visual_row: 7, visual_column: 3 }, blockA)).toEqual({ x: 3, y: 7, source: "grid" });
  });

  it("visual_x/visual_y (posisi bebas) punya prioritas tertinggi", () => {
    expect(resolvePosition({ ...base, visual_row: 7, visual_column: 3, visual_x: 2.5, visual_y: 9.25 }, blockA)).toEqual({
      x: 2.5,
      y: 9.25,
      source: "free",
    });
  });

  it("blok tanpa grid & makam tanpa posisi => belum ditetapkan (tidak hard-code kapasitas)", () => {
    expect(resolvePosition(base, { grid_rows: null, grid_columns: null })).toBeNull();
  });

  it("ukuran kanvas mengikuti data, bukan konstanta", () => {
    const positions = [
      { x: 1, y: 1, source: "auto" as const },
      { x: 12, y: 3, source: "grid" as const },
    ];
    expect(blockExtent(positions, blockA)).toEqual({ columns: 12, rows: 15 });
    expect(canvasSize({ columns: 1, rows: 1 }).width).toBeGreaterThan(0);
    expect(cellKey({ x: 2, y: 4 })).toBe(cellKey({ x: 2, y: 4 }));
  });
});

describe("kompresi foto (guardrails)", () => {
  it("resize sisi terpanjang <= 1280px dengan rasio tetap", () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it("menurunkan kualitas sampai <= target 250 KB (WebP)", async () => {
    const sizes: Record<string, number> = { "0.82": 400_000, "0.74": 300_000, "0.66": 200_000 };
    const encode = vi.fn(async (type: string, quality: number) => new Blob([new Uint8Array(sizes[String(quality)] ?? 150_000)], { type }));
    const result = await encodeWithinBudget(encode, 250 * 1024, 1024 * 1024);
    expect(result?.type).toBe("image/webp");
    expect(result?.blob.size).toBe(200_000);
    expect(encode).toHaveBeenCalledTimes(3);
  });

  it("fallback JPEG bila browser tidak mendukung WebP", async () => {
    const encode = vi.fn(async (type: string) => new Blob([new Uint8Array(100_000)], { type: type === "image/webp" ? "image/png" : type }));
    const result = await encodeWithinBudget(encode, 250 * 1024, 1024 * 1024);
    expect(result?.type).toBe("image/jpeg");
  });

  it("null bila tidak ada hasil <= batas keras (pemanggil memperkecil dimensi)", async () => {
    const encode = async (type: string) => new Blob([new Uint8Array(2_000_000)], { type });
    await expect(encodeWithinBudget(encode, 250 * 1024, 1024 * 1024)).resolves.toBeNull();
  });
});

describe("validasi foto di server", () => {
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

  it("menerima WebP & JPEG berdasarkan signature byte", async () => {
    await expect(validateCompressedPhoto(new Blob([webp]))).resolves.toMatchObject({ ok: true, extension: "webp" });
    await expect(validateCompressedPhoto(new Blob([jpeg]))).resolves.toMatchObject({ ok: true, extension: "jpg" });
  });

  it("menolak file bukan gambar walau MIME dipalsukan, kosong, atau > 1 MB", async () => {
    await expect(validateCompressedPhoto(new Blob(["<svg onload=alert(1)>"], { type: "image/webp" }))).resolves.toMatchObject({ ok: false });
    await expect(validateCompressedPhoto(new Blob([]))).resolves.toMatchObject({ ok: false });
    await expect(validateCompressedPhoto(new Blob([new Uint8Array(1024 * 1024 + 1)]))).resolves.toMatchObject({ ok: false });
  });

  it("path unik per unggahan (grave-photos/{id}/cover-{waktu}.webp)", () => {
    expect(buildPhotoPath("abc", "webp", 123)).toBe("abc/cover-123.webp");
  });
});
