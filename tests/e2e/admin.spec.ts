import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Alur Admin terhadap fake-supabase (in-memory, lihat tests/e2e/fake-supabase.mjs).
 * Storage tiruan SELALU menolak upload => menguji bahwa kegagalan foto tidak menggagalkan simpan data.
 */
const ADMIN = { email: "admin.e2e@tpu.test", password: "RahasiaE2E-123" };

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible({ timeout: 15_000 });
}

test.describe("Admin", () => {
  test("password salah => pesan sederhana", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password", { exact: true }).fill("salah-sekali");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau password salah. Silakan coba lagi.")).toBeVisible();
  });

  test("dashboard: KPI, chart, dan ringkasan data", async ({ page }) => {
    await login(page);
    const kpi = page.getByRole("region", { name: "Ringkasan utama" });
    for (const label of ["Total Makam", "Perlu Verifikasi", "Sudah Terverifikasi", "Total Blok Aktif"]) {
      await expect(kpi.getByText(label, { exact: true })).toBeVisible();
    }
    for (const title of ["Komposisi Status Makam", "Distribusi Makam per Blok", "Aktivitas Data per Bulan", "Ringkasan Verifikasi", "Blok dengan Data Terbanyak", "Aktivitas Terbaru"]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    await expect(page.getByText("Aksi Cepat")).toHaveCount(0);
  });

  test("verifikasi per field: hanya field bermasalah merah, merah hilang setelah ditandai benar & disimpan", async ({ page }, info) => {
    // Proyek berbeda memakai record berbeda karena data fake dipakai bersama.
    const code = info.project.name === "desktop" ? "A-002" : "A-003"; // A-002: alamat; A-003: nama ahli waris
    const expected = code === "A-002" ? "Alamat ahli waris perlu diverifikasi" : "Perlu verifikasi nama ahli waris";
    await login(page);
    await page.goto(`/admin/makam?status=needs_verification&q=${code}`);
    await page.getByRole("link", { name: /Edit & Verifikasi/ }).locator("visible=true").first().click();
    await expect(page.getByRole("heading", { name: `Edit Data Makam ${code}` })).toBeVisible();

    const flagged = page.locator("[data-flagged]");
    await expect(flagged).toHaveCount(1);
    await expect(flagged).toContainText(expected);

    await flagged.getByRole("button", { name: "Tandai sudah benar" }).click();
    await expect(page.locator("[data-flagged]")).toHaveCount(0);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Data berhasil disimpan.")).toBeVisible();
    await expect(page.getByText("Terverifikasi").first()).toBeVisible();

    await page.reload();
    await expect(page.locator("[data-flagged]")).toHaveCount(0);
  });

  test("menu Admin tanpa Verifikasi Data; verifikasi ada di Data Makam; route lama dialihkan", async ({ page }) => {
    await login(page);
    const nav = page.getByRole("navigation", { name: "Menu Admin" }).locator("visible=true");
    for (const label of ["Dashboard", "Data", "Denah", "Pengaturan"]) {
      await expect(nav.getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /Verifikasi Data/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Keluar" }).locator("visible=true")).toBeVisible();

    await page.goto("/admin/verifikasi?q=A-0");
    await expect(page).toHaveURL(/\/admin\/makam\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("status")).toBe("needs_verification");
    expect(url.searchParams.get("q")).toBe("A-0");
    const tabs = page.getByRole("navigation", { name: "Filter status" });
    await expect(tabs.getByRole("link", { name: /Perlu Verifikasi/ })).toHaveAttribute("aria-current", "page");
    for (const label of ["Semua", "Terverifikasi"]) await expect(tabs.getByRole("link", { name: label, exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Field yang perlu dicek" })).toBeVisible();
  });

  test("tambah makam tanpa foto: kode dibuat otomatis dari blok + nomor", async ({ page }, info) => {
    await login(page);
    await page.goto("/admin/makam/tambah");
    const number = info.project.name === "desktop" ? "7" : "8";
    await page.getByLabel("Nama yang dimakamkan").fill(`Uji Tanpa Foto ${info.project.name}`);
    await page.locator("#f-block_id").selectOption({ label: "Blok B" });
    await page.getByLabel("Nomor makam").fill(number);
    await expect(page.getByText(`B-00${number}`)).toBeVisible();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Data berhasil disimpan.")).toBeVisible();
    await expect(page.getByRole("heading", { name: `Edit Data Makam B-00${number}` })).toBeVisible();
  });

  test("foto gagal diunggah (storage penuh) TIDAK menggagalkan simpan data", async ({ page }, info) => {
    await login(page);
    await page.goto("/admin/makam/tambah");
    const number = info.project.name === "desktop" ? "21" : "22";
    await page.getByLabel("Nama yang dimakamkan").fill(`Uji Foto Gagal ${info.project.name}`);
    await page.locator("#f-block_id").selectOption({ label: "Blok C" });
    await page.getByLabel("Nomor makam").fill(number);
    await page.locator("#f-photo").setInputFiles(join(process.cwd(), "public/assets/placeholders/grave-photo-placeholder-1024x1024.png"));
    await expect(page.getByText(/Siap diunggah saat disimpan/)).toBeVisible();
    await expect(page.getByText(/WebP|JPEG/).first()).toBeVisible();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Data makam berhasil disimpan. Foto gagal diunggah.")).toBeVisible();
    await expect(page.getByText("Foto gagal diunggah. Data makam tetap berhasil disimpan.")).toBeVisible();
    await expect(page.getByRole("heading", { name: `Edit Data Makam C-0${number}` })).toBeVisible();
  });

  test("nomor makam dobel di blok yang sama ditolak dan field difokuskan", async ({ page }) => {
    await login(page);
    await page.goto("/admin/makam/tambah");
    await page.getByLabel("Nama yang dimakamkan").fill("Uji Duplikat");
    await page.locator("#f-block_id").selectOption({ label: "Blok A" });
    await page.getByLabel("Nomor makam").fill("32");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByRole("main").getByText("Nomor makam 32 sudah dipakai di Blok A.")).toBeVisible();
    await expect(page.getByLabel("Nomor makam")).toBeFocused();
  });

  test("validasi form: pesan sederhana di bawah field", async ({ page }) => {
    await login(page);
    await page.goto("/admin/makam/tambah");
    await page.getByLabel("Nama yang dimakamkan").fill("");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Nama yang dimakamkan wajib diisi.")).toBeVisible();
  });

  test("Data Makam, Denah Blok & Pengaturan terbuka; export CSV tersedia; keluar", async ({ page }) => {
    await login(page);
    await page.goto("/admin/makam?q=rita");
    await expect(page.getByText("A-032").locator("visible=true").first()).toBeVisible();
    const csv = await page.request.get("/admin/makam/export");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("heir_address");

    await page.goto("/admin/denah?blok=A");
    await expect(page.getByRole("img", { name: "Editor denah Blok A" })).toBeVisible();
    await page.getByLabel("Pilih makam").selectOption({ label: "A-032 · Rita Mangsari" });
    await expect(page.getByText("Otomatis dari nomor (simulasi)")).toBeVisible();

    await page.goto("/admin/pengaturan");
    await expect(page.getByLabel("Lokasi untuk Google Maps")).toHaveValue(/548F\+PCC/);

    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
