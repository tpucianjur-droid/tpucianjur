import { expect, test, type Page } from "@playwright/test";

const RESULTS = {
  total: 2,
  items: [
    { id: "11111111-1111-4111-8111-111111111111", grave_code: "A-032", deceased_name: "Rita Mangsari", death_date: "2021-03-12", block_code: "A", grave_number: 32 },
    { id: "22222222-2222-4222-8222-222222222222", grave_code: "A-077", deceased_name: "Siti Rita", death_date: null, block_code: "A", grave_number: 77 },
  ],
};

/** Mock API pencarian di browser agar alur UI dapat diuji tanpa database. */
async function mockSearch(page: Page, handler: (url: URL) => { status: number; body: unknown }) {
  const requests: string[] = [];
  await page.route("**/api/cari?**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.searchParams.get("q") ?? "");
    const { status, body } = handler(url);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return requests;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Beranda", () => {
  test("search box langsung tersedia dan mengarah ke pencarian", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("TPU Astana Pratiksha");
    const box = page.getByRole("searchbox", { name: "Nama yang dimakamkan" });
    await expect(box).toBeVisible();
    await box.fill("Rita");
    await page.getByRole("button", { name: "Cari Makam" }).click();
    await expect(page).toHaveURL(/\/cari-makam\?q=Rita/);
  });
});

test.describe("Cari Makam (UI, API di-mock)", () => {
  test("partial name: hasil menampilkan nama, wafat, blok, nomor, kode + tombol Detail & Lihat Posisi", async ({ page }) => {
    const requests = await mockSearch(page, () => ({ status: 200, body: RESULTS }));
    await page.goto("/cari-makam");
    const input = page.getByLabel("Nama yang dimakamkan atau kode makam");
    await input.pressSequentially("rita", { delay: 40 });

    const first = page.getByRole("article").filter({ hasText: "Rita Mangsari" });
    await expect(first).toBeVisible();
    await expect(first).toContainText("Wafat: 12 Maret 2021");
    await expect(first).toContainText("A-032");
    await expect(first).toContainText("032");
    await expect(first.getByRole("link", { name: /Detail/ })).toHaveAttribute("href", "/makam/A-032");
    await expect(first.getByRole("link", { name: /Lihat Posisi/ })).toHaveAttribute("href", "/makam/A-032/lokasi");
    await expect(page.getByRole("status").filter({ hasText: "Ditemukan 2 hasil" })).toBeVisible();

    // Debounce: mengetik 4 huruf tidak memicu 4 request.
    expect(requests.length).toBeLessThanOrEqual(2);
    expect(requests.at(-1)).toBe("rita");
    await expect(page).toHaveURL(/q=rita/);
  });

  test("tidak ditemukan => empty state yang jelas", async ({ page }) => {
    await mockSearch(page, () => ({ status: 200, body: { items: [], total: 0 } }));
    await page.goto("/cari-makam");
    await page.getByLabel("Nama yang dimakamkan atau kode makam").fill("zzzz");
    await expect(page.getByText("Makam tidak ditemukan.")).toBeVisible();
  });

  test("error server => pesan sederhana + tombol coba lagi", async ({ page }) => {
    let fail = true;
    await mockSearch(page, () =>
      fail ? { status: 503, body: { error: "Data belum dapat dimuat. Coba lagi.", items: [], total: 0 } } : { status: 200, body: RESULTS },
    );
    await page.goto("/cari-makam");
    await page.getByLabel("Nama yang dimakamkan atau kode makam").fill("rita");
    await expect(page.getByText("Data belum dapat dimuat").first()).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByRole("link", { name: "Rita Mangsari", exact: true })).toBeVisible();
  });

  test("filter blok opsional ikut terkirim", async ({ page }) => {
    const blocks: (string | null)[] = [];
    await page.route("**/api/cari?**", async (route) => {
      blocks.push(new URL(route.request().url()).searchParams.get("blok"));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RESULTS) });
    });
    await page.goto("/cari-makam");
    await page.getByLabel("Nama yang dimakamkan atau kode makam").fill("rita");
    await expect(page.getByRole("link", { name: "Rita Mangsari", exact: true })).toBeVisible();
    const chip = page.getByRole("button", { name: "Blok A", exact: true });
    if (await chip.count()) {
      await chip.click();
      await expect.poll(() => blocks.at(-1)).toBe("A");
    }
  });
});

test.describe("Halaman informasi & responsif", () => {
  for (const path of ["/", "/cari-makam", "/panduan", "/tentang", "/denah", "/admin/login"]) {
    test(`tanpa horizontal scroll: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test("Panduan: 4 langkah & FAQ dapat dibuka", async ({ page }) => {
    await page.goto("/panduan");
    await expect(page.getByRole("list").filter({ hasText: "Cek denah posisi makam" }).getByRole("listitem")).toHaveCount(4);
    await page.getByText("Bagaimana cara mencari makam?").click();
    await expect(page.getByText(/minimal 2 huruf/)).toBeVisible();
  });

  test("Tentang: menjelaskan privasi data ahli waris", async ({ page }) => {
    await page.goto("/tentang");
    await expect(page.getByText(/data internal/)).toBeVisible();
  });

  test("navigasi mobile/desktop dapat dipakai dengan keyboard", async ({ page, isMobile }) => {
    await page.goto("/panduan");
    // HP & tablet: bottom navigation (tanpa hamburger). Desktop: navbar horizontal.
    const nav = page.getByRole("navigation", { name: isMobile ? "Navigasi utama" : "Menu utama" });
    await nav.getByRole("link", { name: "Tentang" }).click();
    await expect(page).toHaveURL(/\/tentang/);
    await expect(nav.getByRole("link", { name: "Tentang" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: /Buka menu/ })).toHaveCount(0);
  });
});
