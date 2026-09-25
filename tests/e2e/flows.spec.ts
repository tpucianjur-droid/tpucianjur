import { expect, test } from "@playwright/test";

/** Alur publik end-to-end dengan data 149 makam (field publik) dari fake-supabase. */
test.describe("Alur publik: cari → detail → posisi", () => {
  test("partial search 'rit' (tanpa nama lengkap) menemukan Rita Mangsari A-032", async ({ page }) => {
    await page.goto("/cari-makam?q=rit");
    const card = page.getByRole("article").filter({ hasText: "Rita Mangsari" });
    await expect(card.getByRole("link", { name: /Detail/ })).toHaveAttribute("href", "/makam/A-032");
    // Hasil pencarian hanya ringkasan: tanggal wafat & kode makam ada di halaman Detail.
    await expect(card).not.toContainText("9 April 2025");
    await expect(card).not.toContainText("A-032");
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
    for (const label of ["Tanggal Wafat", "Blok Makam", "Nomor Makam", "Kode Makam", "Lokasi TPU"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
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

  test("denah: makam tujuan di-highlight (Dipilih), lainnya Terisi/Kosong, legenda & petunjuk baris/kolom", async ({ page }) => {
    await page.goto("/makam/A-032/lokasi");
    const map = page.getByRole("img", { name: /Rita Mangsari, kode A-032, ditandai hijau/ });
    await expect(map).toBeVisible();
    // Target = Dipilih (hijau tua penuh); 148 makam lain ber-data = Terisi.
    await expect(map.locator('rect[fill="#174a3a"]')).toHaveCount(1);
    await expect(map.locator('rect[fill="#c3d8ca"]')).toHaveCount(148);
    // 150–163 terisi (belum ada data sistem) & petak kosong sampai 1000 digambar sebagai path ringan.
    await expect(map.locator('path[fill="#c3d8ca"]')).toHaveCount(1);
    await expect(map.locator('path[fill="#fbfdfc"]')).toHaveCount(1);
    for (const label of ["Terisi", "Kosong", "Dipilih"]) await expect(page.getByLabel("Legenda denah")).toContainText(label);
    // A-032 pada layout Blok A => baris 2 (022–054), kolom 11.
    await expect(page.getByText(/baris 2/)).toBeVisible();
    await expect(page.getByText(/kolom 11/)).toBeVisible();

    // Zoom/pan tidak error dan fokus kembali ke makam.
    const before = await map.getAttribute("viewBox");
    await page.getByRole("button", { name: "Perbesar" }).click();
    expect(await map.getAttribute("viewBox")).not.toBe(before);
    await page.getByRole("button", { name: "Tampilkan seluruh blok" }).click();
    await page.getByRole("button", { name: "Fokus ke makam" }).click();
  });

  test("denah: ketuk makam lain => highlight & info pindah, bisa kembali ke makam tujuan", async ({ page }) => {
    await page.goto("/makam/A-032/lokasi");
    await page.getByRole("button", { name: "Tampilkan seluruh blok" }).click();
    const other = page.locator('[data-grave-id="00000000-0000-4000-8000-000000000001"]');
    await other.click();
    await expect(page.getByText("Makam dipilih")).toBeVisible();
    await expect(page.getByRole("link", { name: /Detail makam/ })).toHaveAttribute("href", "/makam/A-001");
    await expect(other.locator("rect")).toHaveAttribute("fill", "#174a3a");
    await page.getByRole("button", { name: /Makam tujuan/ }).click();
    await expect(page.getByText("Makam dipilih")).toHaveCount(0);
  });

  test("halaman Denah: tandai kode makam, blok tanpa data menampilkan empty state", async ({ page }) => {
    await page.goto("/denah?kode=A-032");
    await expect(page.getByRole("img", { name: /A-032, ditandai hijau/ })).toBeVisible();
    await page.getByRole("link", { name: "Blok D" }).click();
    await expect(page.getByText("Blok D belum dipetakan")).toBeVisible();
  });

  test("kode tidak terdaftar => 'Makam tidak ditemukan.'", async ({ page }) => {
    // Catatan: dengan loading.tsx (streaming) status HTTP bisa 200; kontennya tetap halaman not-found (noindex).
    await page.goto("/makam/A-999");
    await expect(page.getByText("Makam tidak ditemukan.")).toBeVisible();
  });
});
