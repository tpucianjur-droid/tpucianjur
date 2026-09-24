import { expect, test } from "@playwright/test";

/** Alur publik end-to-end dengan data 149 makam (field publik) dari fake-supabase. */
test.describe("Alur publik: cari → detail → posisi", () => {
  test("partial search 'rit' (tanpa nama lengkap) menemukan Rita Mangsari A-032", async ({ page }) => {
    await page.goto("/cari-makam?q=rit");
    const card = page.getByRole("article").filter({ hasText: "Rita Mangsari" });
    await expect(card).toContainText("A-032");
    await expect(card).toContainText("Wafat: 9 April 2025");
  });

  test("case-insensitive: 'SOPANDI' menemukan 2 makam", async ({ page }) => {
    await page.goto("/cari-makam");
    await page.getByLabel("Nama yang dimakamkan atau kode makam").fill("SOPANDI");
    await expect(page.getByRole("status").filter({ hasText: "Ditemukan 2 hasil" })).toBeVisible();
  });

  test("pencarian dengan kode makam A-032", async ({ page }) => {
    await page.goto("/cari-makam?q=A-032");
    await expect(page.getByRole("article").first()).toContainText("Rita Mangsari");
  });

  test("detail makam: data publik, placeholder foto, tombol Maps & posisi", async ({ page }) => {
    await page.goto("/makam/A-032");
    await expect(page.getByRole("heading", { name: "Rita Mangsari" })).toBeVisible();
    await expect(page.getByText("9 April 2025")).toBeVisible();
    await expect(page.getByText("Foto makam belum tersedia")).toBeVisible();
    const maps = page.getByRole("link", { name: /Petunjuk ke TPU/ });
    await expect(maps).toHaveAttribute("href", /google\.com\/maps\/dir\/\?api=1&destination=.*548F%2BPCC/);
    await expect(maps).toHaveAttribute("target", "_blank");
    await page.getByRole("link", { name: "Lihat Posisi Makam" }).click();
    await expect(page).toHaveURL(/\/makam\/A-032\/lokasi$/);
  });

  test("tanggal wafat kosong (staging BELUM_DIPASTIKAN) tidak menampilkan tanggal mentah", async ({ page }) => {
    await page.goto("/makam/A-117");
    await expect(page.getByText("Belum tercatat")).toBeVisible();
    await expect(page.getByText("27-06-1967")).toHaveCount(0);
  });

  test("denah: makam tujuan di-highlight, lainnya abu-abu, legenda & petunjuk baris/kolom", async ({ page }) => {
    await page.goto("/makam/A-032/lokasi");
    const map = page.getByRole("img", { name: /Rita Mangsari, kode A-032, ditandai hijau/ });
    await expect(map).toBeVisible();
    // Target berwarna hijau tua, makam lain abu-abu.
    await expect(map.locator('path[fill="#174a3a"]')).toHaveCount(1);
    await expect(map.locator('path[fill="#c9cfcc"]')).toHaveCount(148);
    await expect(page.getByLabel("Legenda denah")).toContainText("Makam yang dicari");
    // A-032 pada grid simulasi 10 kolom => baris 4, kolom 2.
    await expect(page.getByText(/baris 4/)).toBeVisible();
    await expect(page.getByText(/kolom 2/)).toBeVisible();

    // Zoom/pan tidak error dan fokus kembali ke makam.
    const before = await map.getAttribute("viewBox");
    await page.getByRole("button", { name: "Perbesar" }).click();
    expect(await map.getAttribute("viewBox")).not.toBe(before);
    await page.getByRole("button", { name: "Tampilkan seluruh blok" }).click();
    await page.getByRole("button", { name: "Fokus ke makam" }).click();
  });

  test("denah: ketuk makam lain menampilkan nama & tautan detail", async ({ page }) => {
    await page.goto("/makam/A-032/lokasi");
    await page.getByRole("button", { name: "Tampilkan seluruh blok" }).click();
    const other = page.locator('[data-grave-id="00000000-0000-4000-8000-000000000001"]');
    await other.click();
    await expect(page.getByRole("link", { name: /Lihat detail/ })).toHaveAttribute("href", "/makam/A-001");
  });

  test("halaman Denah: tandai kode makam, blok tanpa data menampilkan empty state", async ({ page }) => {
    await page.goto("/denah?kode=A-032");
    await expect(page.getByRole("img", { name: /A-032, ditandai hijau/ })).toBeVisible();
    await page.getByRole("link", { name: "Blok D" }).click();
    await expect(page.getByText("Denah Blok D belum tersedia")).toBeVisible();
  });

  test("kode tidak terdaftar => 'Makam tidak ditemukan.'", async ({ page }) => {
    // Catatan: dengan loading.tsx (streaming) status HTTP bisa 200; kontennya tetap halaman not-found (noindex).
    await page.goto("/makam/A-999");
    await expect(page.getByText("Makam tidak ditemukan.")).toBeVisible();
  });
});
