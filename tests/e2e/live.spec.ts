import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Tes terhadap Supabase HOSTED (butuh .env.local yang valid + SETUP_SUPABASE_ONLINE.sql sudah dijalankan).
 * Tes Admin juga butuh E2E_ADMIN_EMAIL & E2E_ADMIN_PASSWORD (akun uji yang terdaftar di admin_users).
 * Tes Admin TIDAK mengubah 149 data awal: membuat data uji di Blok D lalu mengarsipkannya.
 */
function loadEnvLocal(): Record<string, string> {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).trim()];
      }),
  );
}

const env = { ...loadEnvLocal(), ...process.env } as Record<string, string | undefined>;
const hasSupabase = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR-PROJECT-REF"));
const hasAdmin = Boolean(env.E2E_ADMIN_EMAIL && env.E2E_ADMIN_PASSWORD);

test.describe("Publik (Supabase hosted)", () => {
  test.skip(!hasSupabase, "Supabase hosted belum dikonfigurasi di .env.local");

  test("partial search 'sutiar' menampilkan nama ahli waris tanpa membuka data privat", async ({ page }) => {
    await page.goto("/cari-makam?q=sutiar");
    const card = page.getByRole("article").filter({ hasText: "Sutiarna" });
    await expect(card).toContainText("A-001");
    await expect(card).toContainText("Ahli Waris: Indra Mawana Yusuf");
    await card.getByRole("link", { name: /Detail/ }).click();
    await expect(page).toHaveURL(/\/makam\/A-001$/);
    await expect(page.getByRole("heading", { name: "Sutiarna" })).toBeVisible();
    await expect(page.getByText("17 Agustus 2024")).toBeVisible();
    const mainText = await page.getByRole("main").innerText();
    // Detail menampilkan nama ahli waris saja, tanpa telepon/alamat.
    expect(mainText).toContain("Indra Mawana Yusuf");
    expect(mainText).not.toContain("Griya Permata Permai");
  });

  test("API pencarian tidak mengirim telepon/alamat ahli waris", async ({ request }) => {
    const res = await request.get("/api/cari?q=komala");
    const text = await res.text();
    expect(text).not.toMatch(/heir_phone|heir_address|Komala Ningsih/);
    const res2 = await request.get("/api/cari?q=supriyatna");
    expect(await res2.text()).toContain("A-002");
  });

  test("Petunjuk ke TPU memakai lokasi dari pengaturan", async ({ page }) => {
    await page.goto("/makam/A-001");
    const link = page.getByRole("link", { name: /Petunjuk ke TPU/ });
    await expect(link).toHaveAttribute("href", /google\.com\/maps/);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("denah otomatis fokus & highlight makam tujuan (A-032)", async ({ page }) => {
    await page.goto("/makam/A-032/lokasi");
    const map = page.getByRole("img", { name: /ditandai hijau/ });
    await expect(map).toBeVisible();
    await expect(page.getByLabel("Legenda denah")).toContainText("Makam yang dicari");
    await page.getByRole("button", { name: "Perbesar" }).click();
    await page.getByRole("button", { name: "Tampilkan seluruh blok" }).click();
  });

  test("kode huruf kecil diarahkan ke kode kanonik", async ({ page }) => {
    await page.goto("/makam/a-32");
    await expect(page).toHaveURL(/\/makam\/A-032$/);
  });
});

test.describe("Admin (Supabase hosted)", () => {
  test.skip(!hasSupabase || !hasAdmin, "Butuh .env.local + E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD");
  test.describe.configure({ mode: "serial" });

  test("login → tambah (tanpa foto) → field merah → verifikasi → foto gagal tidak menggagalkan simpan → arsip", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible({ timeout: 15_000 });

    // Tambah data uji (tanpa foto).
    await page.goto("/admin/makam/tambah");
    const number = String(90000 + Math.floor(Math.random() * 9000));
    await page.getByLabel("Nama yang dimakamkan").fill("E2E Uji Otomatis");
    await page.locator("#f-block_id").selectOption({ label: "Blok D" });
    await page.getByLabel("Nomor makam").fill(number);
    await page.getByLabel("Alamat ahli waris").fill("Alamat uji otomatis");
    // Tandai alamat perlu dicek di bagian E.
    await page.getByRole("listitem").filter({ hasText: "Alamat ahli waris" }).getByRole("button", { name: "Tandai perlu dicek" }).click();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Data berhasil disimpan.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/makam\/[0-9a-f-]+\/edit/);

    // Hanya alamat yang merah (AC-ADM-02).
    const flagged = page.locator("[data-flagged]");
    await expect(flagged).toHaveCount(1);
    await expect(flagged).toContainText("Alamat ahli waris perlu diverifikasi");

    // Foto gagal diunggah (request upload diputus) — data tetap tersimpan (AC-ADM-04).
    await page.route("**/admin/makam/**", async (route) => {
      const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
      const isPhotoUpload = route.request().method() === "POST" && /filename="foto\.(webp|jpg)"/.test(body);
      if (isPhotoUpload) {
        await route.abort();
        return;
      }
      await route.continue();
    });
    await page.locator("#f-photo").setInputFiles(join(process.cwd(), "public/assets/placeholders/grave-photo-placeholder-1024x1024.png"));
    await expect(page.getByText(/Siap diunggah saat disimpan/)).toBeVisible();

    // Verifikasi field lalu simpan (AC-ADM-03).
    await flagged.getByRole("button", { name: "Tandai sudah benar" }).click();
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByText("Data makam berhasil disimpan. Foto gagal diunggah.")).toBeVisible();
    await expect(page.getByText("Foto gagal diunggah. Data makam tetap berhasil disimpan.")).toBeVisible();
    await expect(page.locator("[data-flagged]")).toHaveCount(0);
    await page.unroute("**/admin/makam/**");

    // Bersihkan: arsipkan data uji.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Arsipkan data" }).click();
    await expect(page.locator('[aria-live="polite"]').getByRole("status").filter({ hasText: /dipindahkan ke arsip/ })).toBeVisible();
  });
});
